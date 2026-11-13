<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Assignment;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

class QuizAttemptController extends Controller
{
    /**
     * Small allowance for network latency so a submission sent right at the
     * deadline is not lost.
     */
    private const TIME_LIMIT_GRACE_SECONDS = 15;

    public function myAttempts(Request $request)
    {
        $attempts = QuizAttempt::where('student_id', $request->user()->id)
            ->whereNotNull('completed_at')
            ->with(['quiz:quiz_id,title', 'assignment:id,title'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (QuizAttempt $attempt) => [
                'attempt_id' => $attempt->id,
                'quiz_id' => $attempt->quiz_id,
                'quiz_title' => $attempt->quiz?->title,
                'assignment_id' => $attempt->assignment_id,
                'assignment_title' => $attempt->assignment?->title,
                'attempt_number' => $attempt->attempt_number,
                'score' => (float) $attempt->score,
                'teacher_score' => $attempt->teacher_score !== null ? (float) $attempt->teacher_score : null,
                'final_score' => $attempt->finalScore(),
                'total' => (int) $attempt->total,
                'percentage' => $attempt->finalPercentage(),
                'teacher_feedback' => $attempt->teacher_feedback,
                'graded_at' => $attempt->graded_at,
                'completed_at' => $attempt->completed_at,
            ]);

        return response()->json($attempts);
    }

    /**
     * Reopens one of the student's own attempts, including the teacher's
     * manual grade and feedback when the teacher has graded it.
     */
    public function attempt(Request $request, QuizAttempt $attempt)
    {
        if ($attempt->student_id !== $request->user()->id) abort(403);

        $attempt->load([
            'quiz:quiz_id,title',
            'assignment:id,title',
            'grader:id,name,first_name,last_name',
        ]);

        $questions = $attempt->quiz
            ? $attempt->quiz->questions()->with('answers')->orderBy('display_order')->get()->keyBy('question_id')
            : collect();

        $review = collect($attempt->answers_data['answers'] ?? [])
            ->map(fn (array $row) => $this->reviewRow($row, $questions->get($row['question_id'] ?? '')))
            ->values();

        return response()->json([
            'attempt_id' => $attempt->id,
            'quiz_id' => $attempt->quiz_id,
            'quiz_title' => $attempt->quiz?->title,
            'assignment_id' => $attempt->assignment_id,
            'assignment_title' => $attempt->assignment?->title,
            'attempt_number' => $attempt->attempt_number,
            'score' => (float) $attempt->score,
            'teacher_score' => $attempt->teacher_score !== null ? (float) $attempt->teacher_score : null,
            'final_score' => $attempt->finalScore(),
            'total' => (int) $attempt->total,
            'percentage' => $attempt->finalPercentage(),
            'teacher_feedback' => $attempt->teacher_feedback,
            'graded_at' => $attempt->graded_at,
            'graded_by' => $attempt->grader?->name,
            'started_at' => $attempt->started_at,
            'completed_at' => $attempt->completed_at,
            'questions' => $review,
        ]);
    }

    /**
     * Starts a timed attempt. The server decides the start time and signs it,
     * so a client cannot extend its own time limit.
     */
    public function start(Request $request, Quiz $quiz)
    {
        Gate::authorize('view', $quiz);

        $data = $request->validate([
            'assignment_id' => ['nullable', 'string', 'exists:assignments,id'],
        ]);

        $assignmentId = $data['assignment_id'] ?? null;
        $assignment = $assignmentId ? Assignment::find($assignmentId) : null;

        if ($assignment && $assignment->quiz_id !== $quiz->quiz_id) {
            return response()->json(['message' => 'This assignment does not belong to the quiz.'], 422);
        }

        if ($assignment && ! $assignment->isForStudent($request->user()->id)) {
            return response()->json(['message' => 'This assignment was not assigned to you.'], 403);
        }

        if ($assignment && ! $assignment->isOpen()) {
            return response()->json(['message' => 'This assignment is closed.'], 422);
        }

        if ($assignment && $assignment->attemptsRemaining($request->user()->id) <= 0) {
            return response()->json(['message' => 'No attempts remaining.'], 422);
        }

        $limitSeconds = $this->timeLimitMinutes($quiz, $assignment) * 60;
        $startedAt = now();

        return response()->json([
            'started_at' => $startedAt->toIso8601String(),
            'server_now' => now()->toIso8601String(),
            'deadline_at' => $limitSeconds > 0 ? $startedAt->copy()->addSeconds($limitSeconds)->toIso8601String() : null,
            'time_limit_seconds' => $limitSeconds > 0 ? $limitSeconds : null,
            'attempt_token' => $limitSeconds > 0
                ? $this->signStartToken($quiz, $assignmentId, $request->user()->id, $startedAt, $limitSeconds)
                : null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'assignment_id' => 'nullable|string|exists:assignments,id',
            'quiz_id' => 'required|string|exists:quizzes,quiz_id',
            'score' => 'required|numeric|min:0',
            'total' => 'required|integer|min:1',
            'answers_data' => 'nullable|array',
            'started_at' => 'nullable|date',
        ]);

        $studentId = $request->user()->id;

        if (!empty($data['assignment_id'])) {
            $assignment = Assignment::find($data['assignment_id']);
            if ($assignment && ! $assignment->isForStudent($studentId)) {
                return response()->json(['message' => 'This assignment was not assigned to you.'], 403);
            }
        }

        $attemptNumber = $this->nextAttemptNumber($data['assignment_id'] ?? null, $studentId);

        if ($attemptNumber === null) {
            return response()->json(['message' => 'No attempts remaining.'], 422);
        }

        $attempt = QuizAttempt::create([
            'assignment_id' => $data['assignment_id'] ?? null,
            'quiz_id' => $data['quiz_id'],
            'student_id' => $studentId,
            'attempt_number' => $attemptNumber,
            'score' => $data['score'],
            'total' => $data['total'],
            'answers_data' => $data['answers_data'] ?? null,
            'started_at' => $data['started_at'] ?? null,
            'completed_at' => now(),
        ]);

        return response()->json($attempt, 201);
    }

    /**
     * Grades a submission on the server. Correct answers are never sent to the
     * browser while the quiz is being taken, so the score has to be decided here.
     */
    public function grade(Request $request, Quiz $quiz)
    {
        Gate::authorize('view', $quiz);

        $data = $request->validate([
            'assignment_id' => ['nullable', 'string', 'exists:assignments,id'],
            'started_at' => ['nullable', 'date'],
            'attempt_token' => ['nullable', 'string', 'max:2048'],
            'answers' => ['array'],
            'answers.*.question_id' => ['required', 'string'],
            'answers.*.answer_id' => ['nullable', 'string'],
            'answers.*.answer_ids' => ['array'],
            'answers.*.answer_ids.*' => ['string'],
            'answers.*.text' => ['nullable', 'string', 'max:2000'],
        ]);

        $assignmentId = $data['assignment_id'] ?? null;
        $assignment = $assignmentId ? Assignment::find($assignmentId) : null;

        if ($assignment && $assignment->quiz_id !== $quiz->quiz_id) {
            return response()->json(['message' => 'This assignment does not belong to the quiz.'], 422);
        }

        if ($assignment && ! $assignment->isForStudent($request->user()->id)) {
            return response()->json(['message' => 'This assignment was not assigned to you.'], 403);
        }

        $timer = $this->verifyTimer($data['attempt_token'] ?? null, $request->user(), $quiz, $assignmentId);

        if ($timer === false) {
            return response()->json(['message' => 'This attempt could not be verified. Start the quiz again.'], 422);
        }

        if ($timer === null && $this->timeLimitMinutes($quiz, $assignment) > 0) {
            return response()->json(['message' => 'Start the quiz before submitting your answers.'], 422);
        }

        if (is_array($timer) && now()->gt($timer['started_at']->copy()->addSeconds($timer['limit_seconds'] + self::TIME_LIMIT_GRACE_SECONDS))) {
            return response()->json(['message' => 'Time is up. The time limit for this attempt has passed.'], 422);
        }

        $startedAt = is_array($timer) ? $timer['started_at'] : ($data['started_at'] ?? null);

        $studentId = $request->user()->id;

        $attemptNumber = $this->nextAttemptNumber($assignmentId, $studentId);

        if ($attemptNumber === null) {
            return response()->json(['message' => 'No attempts remaining.'], 422);
        }

        $submitted = collect($data['answers'] ?? [])->keyBy('question_id');

        $questions = $quiz->questions()
            ->with('answers')
            ->visibleTo($request->user())
            ->orderBy('display_order')
            ->get();

        $score = 0;
        $total = 0;
        $review = [];
        $stored = [];

        foreach ($questions as $question) {
            $given = $submitted->get($question->question_id) ?? [];
            $scorable = $question->question_type !== 'theory';
            $correct = $scorable ? $this->isCorrect($question, $given) : null;

            if ($scorable) {
                $total++;

                if ($correct) {
                    $score++;
                }
            }

            $answerIds = $this->givenAnswerIds($given);
            $text = trim((string) ($given['text'] ?? ''));

            $storedRow = [
                'question_id' => $question->question_id,
                'answer_ids' => $answerIds,
                'text' => $text,
                'is_correct' => $correct,
            ];

            $stored[] = $storedRow;
            $review[] = $this->reviewRow($storedRow, $question);
        }

        $attempt = QuizAttempt::create([
            'assignment_id' => $assignmentId,
            'quiz_id' => $quiz->quiz_id,
            'student_id' => $studentId,
            'attempt_number' => $attemptNumber,
            'score' => $score,
            'total' => $total,
            'answers_data' => ['answers' => $stored],
            'started_at' => $startedAt,
            'completed_at' => now(),
        ]);

        return response()->json([
            'attempt_id' => $attempt->id,
            'quiz_id' => $quiz->quiz_id,
            'quiz_title' => $quiz->title,
            'assignment_id' => $assignmentId,
            'score' => $score,
            'total' => $total,
            'percentage' => $total > 0 ? (int) round($score / $total * 100) : 0,
            'attempt_number' => $attempt->attempt_number,
            'started_at' => $attempt->started_at,
            'completed_at' => $attempt->completed_at,
            'questions' => $review,
        ], 201);
    }

    /**
     * Builds one review row from stored answer data and the current question.
     * Stored ids keep working even when the question itself was edited later.
     */
    private function reviewRow(array $row, ?Question $question): array
    {
        $givenIds = array_map('strval', (array) ($row['answer_ids'] ?? []));

        return [
            'question_id' => $row['question_id'] ?? '',
            'question_text' => $question?->question_text ?? 'Question no longer available',
            'question_type' => $question?->question_type ?? 'theory',
            'is_correct' => $row['is_correct'] ?? null,
            'given_answer_ids' => $givenIds,
            'given_answers' => $question
                ? $question->answers
                    ->whereIn('answer_id', $givenIds)
                    ->map(fn (Answer $answer) => [
                        'answer_id' => $answer->answer_id,
                        'answer_text' => $answer->answer_text,
                    ])
                    ->values()
                    ->all()
                : [],
            'given_text' => (string) ($row['text'] ?? ''),
            'correct_answers' => $question
                ? $question->answers
                    ->where('is_correct', true)
                    ->map(fn (Answer $answer) => [
                        'answer_id' => $answer->answer_id,
                        'answer_text' => $answer->answer_text,
                    ])
                    ->values()
                    ->all()
                : [],
            'correct_text' => $question?->question_type === 'text_input' ? $question->correct_text : null,
        ];
    }

    /** Effective limit in minutes: the assignment overrides the quiz setting. */
    private function timeLimitMinutes(Quiz $quiz, ?Assignment $assignment): int
    {
        $minutes = $assignment?->time_limit_minutes ?? $quiz->time_limit;

        return max(0, (int) $minutes);
    }

    /**
     * Returns the signed timer, null when the attempt is untimed, or false when
     * the token is invalid or belongs to another user, quiz or assignment.
     */
    private function verifyTimer(?string $token, User $user, Quiz $quiz, ?string $assignmentId): array|false|null
    {
        if (! $token) {
            return null;
        }

        $payload = $this->readStartToken($token, $user, $quiz);

        if ($payload === null || ($payload['a'] ?? null) !== $assignmentId) {
            return false;
        }

        return [
            'started_at' => Carbon::createFromTimestamp((int) $payload['s']),
            'limit_seconds' => (int) $payload['l'],
        ];
    }

    private function signStartToken(Quiz $quiz, ?string $assignmentId, string $userId, Carbon $startedAt, int $limitSeconds): string
    {
        $payload = $this->base64UrlEncode(json_encode([
            'u' => (string) $userId,
            'q' => $quiz->quiz_id,
            'a' => $assignmentId,
            's' => $startedAt->getTimestamp(),
            'l' => $limitSeconds,
        ], JSON_THROW_ON_ERROR));

        $signature = hash_hmac('sha256', $payload, (string) config('app.key'), true);

        return $payload.'.'.$this->base64UrlEncode($signature);
    }

    private function readStartToken(string $token, User $user, Quiz $quiz): ?array
    {
        [$payload, $signature] = array_pad(explode('.', $token, 2), 2, null);

        if (! $payload || ! $signature) {
            return null;
        }

        $expected = hash_hmac('sha256', $payload, (string) config('app.key'), true);

        if (! hash_equals($expected, $this->base64UrlDecode($signature) ?? '')) {
            return null;
        }

        $decoded = json_decode($this->base64UrlDecode($payload) ?? '', true);

        if (! is_array($decoded)) {
            return null;
        }

        if ((string) ($decoded['u'] ?? '') !== (string) $user->id || ($decoded['q'] ?? null) !== $quiz->quiz_id) {
            return null;
        }

        return $decoded;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): ?string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }

    private function isCorrect(Question $question, array $given): bool
    {
        return match ($question->question_type) {
            'single_choice', 'multiple_choice', 'true_false' => $this->choiceMatches($question, $given),
            'text_input' => $this->textMatches($question, (string) ($given['text'] ?? '')),
            default => false,
        };
    }

    private function choiceMatches(Question $question, array $given): bool
    {
        $correct = $question->answers
            ->where('is_correct', true)
            ->pluck('answer_id')
            ->map('strval')
            ->sort()
            ->values()
            ->all();

        return $correct !== [] && $correct === $this->givenAnswerIds($given);
    }

    private function textMatches(Question $question, string $given): bool
    {
        $expected = trim((string) $question->correct_text);
        $given = trim($given);

        if ($expected === '' || $given === '') {
            return false;
        }

        return match ($question->match_mode) {
            'case_insensitive' => mb_strtolower($given) === mb_strtolower($expected),
            'partial' => str_contains(mb_strtolower($given), mb_strtolower($expected)),
            default => $given === $expected,
        };
    }

    /** Normalises the answer ids a student picked, sorted so sets compare cleanly. */
    private function givenAnswerIds(array $given): array
    {
        $ids = array_merge((array) ($given['answer_ids'] ?? []), [$given['answer_id'] ?? null]);

        $ids = array_values(array_unique(array_filter(
            array_map('strval', $ids),
            fn (string $id) => $id !== '',
        )));

        sort($ids);

        return $ids;
    }

    /** Returns the attempt number for this student, or null when none remain. */
    private function nextAttemptNumber(?string $assignmentId, string $studentId): ?int
    {
        if (! $assignmentId) {
            return 1;
        }

        $assignment = Assignment::findOrFail($assignmentId);

        if ($assignment->attemptsRemaining($studentId) <= 0) {
            return null;
        }

        return $assignment->attempts()->where('student_id', $studentId)->count() + 1;
    }
}
