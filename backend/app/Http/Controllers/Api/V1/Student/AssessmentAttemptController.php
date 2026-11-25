<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAnswer;
use App\Models\AssessmentAssignment;
use App\Models\AssessmentAttempt;
use App\Models\AssessmentQuestion;
use App\Services\CodeRunner;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AssessmentAttemptController extends Controller
{
    private const GRACE_SECONDS = 15;

    public function __construct(private readonly CodeRunner $runner)
    {
    }

    /** Questions for a student. Correct answers and hidden tests never leave the server. */
    public function questions(Request $request, Assessment $assessment)
    {
        $assignment = $this->resolveAssignment($request, $assessment);

        if (! $assignment) {
            $assignment = $this->assignedToStudent($request, $assessment);
        }

        if (! $assignment) {
            abort(403, 'This assessment was not assigned to you.');
        }

        if (! $assignment->isOpen()) {
            return response()->json(['message' => 'This assessment is closed.'], 422);
        }

        return response()->json(
            $assessment->questions()->with('answers')->orderBy('display_order')->get()
                ->map(fn (AssessmentQuestion $question) => [
                    'question_id' => $question->question_id,
                    'question_text' => $question->question_text,
                    'question_type' => $question->question_type,
                    'points' => (int) $question->points,
                    'display_order' => (int) $question->display_order,
                    'answers' => $question->answers->map(fn ($answer) => [
                        'answer_id' => $answer->answer_id,
                        'answer_text' => $answer->answer_text,
                    ])->values()->all(),
                    'code_config' => $question->question_type === 'code' ? [
                        'language' => $question->language,
                        'starter_code' => $question->starter_code,
                        'tests' => collect($question->tests)
                            ->reject(fn ($test) => (bool) ($test['hidden'] ?? false))
                            ->map(fn ($test) => [
                                'input' => (string) ($test['input'] ?? ''),
                                'expected_output' => (string) ($test['expected_output'] ?? ''),
                            ])
                            ->values()
                            ->all(),
                    ] : null,
                ])->values()->all()
        );
    }

    /** @return array{started_at:string,deadline_at:?string,time_limit_seconds:?int,attempt_token:?string} */
    public function start(Request $request, Assessment $assessment)
    {
        $assignment = $this->resolveAssignment($request, $assessment)
            ?? $this->assignedToStudent($request, $assessment);
        $studentId = $request->user()->id;

        if ($assignment && ! $assignment->isForStudent($studentId)) {
            return response()->json(['message' => 'This assessment was not assigned to you.'], 403);
        }

        if ($assignment && ! $assignment->isOpen()) {
            return response()->json(['message' => 'This assessment is closed.'], 422);
        }

        if ($assignment && $assignment->attemptsRemaining($studentId) <= 0) {
            return response()->json(['message' => 'No attempts remaining.'], 422);
        }

        $minutes = $assignment?->time_limit_minutes ?? $assessment->time_limit_minutes;
        $limitSeconds = max(0, (int) $minutes) * 60;
        $startedAt = now();

        return response()->json([
            'started_at' => $startedAt->toIso8601String(),
            'server_now' => now()->toIso8601String(),
            'deadline_at' => $limitSeconds > 0 ? $startedAt->copy()->addSeconds($limitSeconds)->toIso8601String() : null,
            'time_limit_seconds' => $limitSeconds > 0 ? $limitSeconds : null,
            'attempt_token' => $limitSeconds > 0
                ? $this->signToken($assessment, $assignment?->id, $studentId, $startedAt, $limitSeconds)
                : null,
        ]);
    }

    public function grade(Request $request, Assessment $assessment)
    {
        $data = $request->validate([
            'assignment_id' => ['nullable', 'string', 'exists:assessment_assignments,id'],
            'started_at' => ['nullable', 'date'],
            'attempt_token' => ['nullable', 'string', 'max:2048'],
            'answers' => ['array'],
            'answers.*.question_id' => ['required', 'string'],
            'answers.*.answer_id' => ['nullable', 'string'],
            'answers.*.answer_ids' => ['array'],
            'answers.*.answer_ids.*' => ['string'],
            'answers.*.text' => ['nullable', 'string', 'max:4000'],
            'answers.*.code' => ['nullable', 'string', 'max:10000'],
        ]);

        $assignment = $this->resolveAssignment($request, $assessment, $data['assignment_id'] ?? null)
            ?? $this->assignedToStudent($request, $assessment);
        $studentId = $request->user()->id;

        if ($assignment && ! $assignment->isForStudent($studentId)) {
            return response()->json(['message' => 'This assessment was not assigned to you.'], 403);
        }

        $timer = $this->verifyToken(
            $data['attempt_token'] ?? null,
            $assessment,
            $assignment?->id,
            $studentId
        );

        if ($timer === false) {
            return response()->json(['message' => 'This attempt could not be verified. Start again.'], 422);
        }

        $minutes = $assignment?->time_limit_minutes ?? $assessment->time_limit_minutes;

        if ($timer === null && (int) $minutes > 0) {
            return response()->json(['message' => 'Start the assessment before submitting.'], 422);
        }

        if (is_array($timer) && now()->gt($timer['started_at']->copy()->addSeconds($timer['limit'] + self::GRACE_SECONDS))) {
            return response()->json(['message' => 'Time is up. The time limit for this attempt has passed.'], 422);
        }

        if ($assignment && $assignment->attemptsRemaining($studentId) <= 0) {
            return response()->json(['message' => 'No attempts remaining.'], 422);
        }

        $submitted = collect($data['answers'] ?? [])->keyBy('question_id');
        $questions = $assessment->questions()->with('answers')->orderBy('display_order')->get();

        $score = 0;
        $total = 0;
        $stored = [];
        $review = [];

        foreach ($questions as $question) {
            $given = $submitted->get($question->question_id, []);
            $scorable = $question->question_type !== 'theory';
            $earned = 0;
            $correct = null;
            $testSummary = null;
            $visibleTests = [];

            if ($scorable) {
                $total += (int) $question->points;

                if ($question->question_type === 'code') {
                    $outcome = $this->runner->runTests(
                        (string) ($given['code'] ?? ''),
                        $question->language,
                        $question->tests
                    );
                    $passed = $outcome['passed'];
                    $count = $outcome['total'];
                    $earned = $count > 0 ? round($question->points * $passed / $count, 2) : 0;
                    $correct = $passed === $count && $count > 0;
                    $testSummary = ['passed' => $passed, 'total' => $count];
                    $visibleTests = collect($outcome['results'])
                        ->reject(fn ($result) => $result['hidden'])
                        ->map(fn ($result) => [
                            'test' => $result['test'],
                            'passed' => $result['passed'],
                            'input' => $result['input'],
                            'expected_output' => $result['expected_output'],
                            'actual_output' => $result['actual_output'],
                            'error' => $result['error'],
                        ])
                        ->values()
                        ->all();
                } else {
                    $correct = $this->isCorrect($question, $given);
                    $earned = $correct ? (int) $question->points : 0;
                }

                $score += $earned;
            }

            $row = [
                'question_id' => $question->question_id,
                'answer_ids' => $this->givenIds($given),
                'text' => trim((string) ($given['text'] ?? '')),
                'code' => (string) ($given['code'] ?? ''),
                'is_correct' => $correct,
                'earned' => $earned,
                'test_summary' => $testSummary,
            ];

            $stored[] = $row;
            $review[] = [
                'question_id' => $question->question_id,
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'points' => (int) $question->points,
                'earned' => $earned,
                'is_correct' => $correct,
                'given_answer_ids' => $row['answer_ids'],
                'given_text' => $row['text'],
                'given_code' => $row['code'],
                'correct_answers' => $question->answers->where('is_correct', true)->pluck('answer_text')->values()->all(),
                'correct_text' => $question->correct_text,
                'test_summary' => $testSummary,
                'test_results' => $visibleTests,
            ];
        }

        $attemptNumber = $assignment
            ? $assignment->attempts()->where('student_id', $studentId)->count() + 1
            : 1;

        $attempt = AssessmentAttempt::create([
            'assessment_id' => $assessment->assessment_id,
            'assignment_id' => $assignment?->id,
            'student_id' => $studentId,
            'attempt_number' => $attemptNumber,
            'score' => $score,
            'total' => $total,
            'answers_data' => ['answers' => $stored],
            'started_at' => is_array($timer) ? $timer['started_at'] : ($data['started_at'] ?? null),
            'completed_at' => now(),
        ]);

        return response()->json([
            'attempt' => $this->attemptPayload($attempt, false),
            'questions' => $review,
        ], 201);
    }

    public function myAttempts(Request $request)
    {
        $attempts = AssessmentAttempt::where('student_id', $request->user()->id)
            ->whereNotNull('completed_at')
            ->with(['assessment:assessment_id,title', 'assignment:id,title'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (AssessmentAttempt $attempt) => [
                'attempt_id' => $attempt->id,
                'assessment_id' => $attempt->assessment_id,
                'assessment_title' => $attempt->assessment?->title,
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

    public function attempt(Request $request, AssessmentAttempt $attempt)
    {
        if ($attempt->student_id !== $request->user()->id) abort(403);

        return response()->json($this->attemptPayload($attempt, true));
    }

    private function assignedToStudent(Request $request, Assessment $assessment): ?AssessmentAssignment
    {
        $studentId = $request->user()->id;

        return AssessmentAssignment::where('assessment_id', $assessment->assessment_id)
            ->whereHas('class.students', fn ($query) => $query
                ->where('student_id', $studentId)
                ->where('status', 'active'))
            ->where(fn ($query) => $query
                ->whereNull('student_id')
                ->orWhere('student_id', $studentId))
            ->first();
    }

    private function resolveAssignment(Request $request, Assessment $assessment, ?string $assignmentId = null): ?AssessmentAssignment
    {
        if (! $assignmentId && $request->has('assignment_id')) {
            $assignmentId = $request->input('assignment_id') ?: null;
        }

        if (! $assignmentId) {
            return null;
        }

        $assignment = AssessmentAssignment::findOrFail($assignmentId);

        if ($assignment->assessment_id !== $assessment->assessment_id) {
            abort(422, 'This assignment does not belong to the assessment.');
        }

        return $assignment;
    }

    private function isCorrect(AssessmentQuestion $question, $given): bool
    {
        if (in_array($question->question_type, ['single_choice', 'multiple_choice', 'true_false'], true)) {
            $correct = $question->answers->where('is_correct', true)->pluck('answer_id')->map('strval')->sort()->values()->all();
            $givenIds = $this->givenIds($given);
            sort($givenIds);

            return $correct !== [] && $correct === $givenIds;
        }

        if ($question->question_type === 'text_input') {
            $expected = trim((string) $question->correct_text);
            $actual = trim((string) ($given['text'] ?? ''));

            if ($expected === '' || $actual === '') return false;

            return match ($question->match_mode) {
                'case_insensitive' => mb_strtolower($actual) === mb_strtolower($expected),
                'partial' => str_contains(mb_strtolower($actual), mb_strtolower($expected)),
                default => $actual === $expected,
            };
        }

        return false;
    }

    /** @return array<int, string> */
    private function givenIds($given): array
    {
        $given = is_array($given) ? $given : [];
        $ids = array_merge((array) ($given['answer_ids'] ?? []), [$given['answer_id'] ?? null]);

        return array_values(array_unique(array_filter(array_map('strval', $ids))));
    }

    /** @return array<string, mixed>|false|null */
    private function verifyToken(?string $token, Assessment $assessment, ?string $assignmentId, string $studentId): array|false|null
    {
        if (! $token) return null;

        $payload = $this->readToken($token);

        if ($payload === null
            || ($payload['u'] ?? null) !== $studentId
            || ($payload['a'] ?? null) !== $assessment->assessment_id
            || ($payload['g'] ?? null) !== $assignmentId) {
            return false;
        }

        return [
            'started_at' => Carbon::createFromTimestamp((int) $payload['s']),
            'limit' => (int) $payload['l'],
        ];
    }

    private function signToken(Assessment $assessment, ?string $assignmentId, string $studentId, Carbon $startedAt, int $limit): string
    {
        $payload = $this->encode(json_encode([
            'u' => $studentId,
            'a' => $assessment->assessment_id,
            'g' => $assignmentId,
            's' => $startedAt->timestamp,
            'l' => $limit,
        ]));

        return $payload.'.'.$this->encode(hash_hmac('sha256', $payload, (string) config('app.key')));
    }

    private function readToken(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2) return null;

        $expected = hash_hmac('sha256', $parts[0], (string) config('app.key'));
        if (! hash_equals($expected, $parts[1])) return null;

        $decoded = json_decode($this->decode($parts[0]) ?? '', true);

        return is_array($decoded) ? $decoded : null;
    }

    private function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decode(string $value): ?string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }

    private function attemptPayload(AssessmentAttempt $attempt, bool $withReview): array
    {
        $attempt->load(['assessment:assessment_id,title', 'assignment:id,title', 'grader:id,name']);

        $payload = [
            'attempt_id' => $attempt->id,
            'assessment_id' => $attempt->assessment_id,
            'assessment_title' => $attempt->assessment?->title,
            'assignment_id' => $attempt->assignment_id,
            'assignment_title' => $attempt->assignment?->title,
            'attempt_number' => $attempt->attempt_number,
            'score' => (float) $attempt->score,
            'teacher_score' => $attempt->teacher_score !== null ? (float) $attempt->teacher_score : null,
            'final_score' => $attempt->finalScore(),
            'total' => (int) $attempt->total,
            'percentage' => $attempt->finalPercentage(),
            'teacher_feedback' => $attempt->teacher_feedback,
            'graded_by' => $attempt->grader?->name,
            'graded_at' => $attempt->graded_at,
            'started_at' => $attempt->started_at,
            'completed_at' => $attempt->completed_at,
        ];

        if ($withReview) {
            $questions = $attempt->assessment
                ? $attempt->assessment->questions()->with('answers')->orderBy('display_order')->get()->keyBy('question_id')
                : collect();

            $stored = collect($attempt->answers_data['answers'] ?? []);
            $payload['questions'] = $stored->map(function ($row) use ($questions) {
                $question = $questions->get($row['question_id'] ?? '');

                return [
                    'question_id' => $row['question_id'] ?? '',
                    'question_text' => $question?->question_text ?? 'Question no longer available',
                    'question_type' => $question?->question_type ?? 'theory',
                    'points' => $question ? (int) $question->points : 0,
                    'earned' => $row['earned'] ?? 0,
                    'is_correct' => $row['is_correct'] ?? null,
                    'given_answer_ids' => $row['answer_ids'] ?? [],
                    'given_text' => $row['text'] ?? '',
                    'given_code' => $row['code'] ?? '',
                    'correct_answers' => $question?->answers->where('is_correct', true)->pluck('answer_text')->values()->all() ?? [],
                    'correct_text' => $question?->correct_text,
                    'test_summary' => $row['test_summary'] ?? null,
                ];
            })->values()->all();
        }

        return $payload;
    }
}
