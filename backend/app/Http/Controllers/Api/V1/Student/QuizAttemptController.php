<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Assignment;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class QuizAttemptController extends Controller
{
    public function myAttempts(Request $request)
    {
        $attempts = QuizAttempt::where('student_id', $request->user()->id)
            ->with('quiz:quiz_id,title')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($attempts);
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
            'answers' => ['array'],
            'answers.*.question_id' => ['required', 'string'],
            'answers.*.answer_id' => ['nullable', 'string'],
            'answers.*.answer_ids' => ['array'],
            'answers.*.answer_ids.*' => ['string'],
            'answers.*.text' => ['nullable', 'string', 'max:2000'],
        ]);

        $studentId = $request->user()->id;

        $attemptNumber = $this->nextAttemptNumber($data['assignment_id'] ?? null, $studentId);

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

            $stored[] = [
                'question_id' => $question->question_id,
                'answer_ids' => $answerIds,
                'text' => $text,
                'is_correct' => $correct,
            ];

            $review[] = [
                'question_id' => $question->question_id,
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'is_correct' => $correct,
                'given_answer_ids' => $answerIds,
                'given_text' => $text,
                'correct_answers' => $question->answers
                    ->where('is_correct', true)
                    ->map(fn (Answer $answer) => [
                        'answer_id' => $answer->answer_id,
                        'answer_text' => $answer->answer_text,
                    ])
                    ->values()
                    ->all(),
                'correct_text' => $question->question_type === 'text_input' ? $question->correct_text : null,
            ];
        }

        $attempt = QuizAttempt::create([
            'assignment_id' => $data['assignment_id'] ?? null,
            'quiz_id' => $quiz->quiz_id,
            'student_id' => $studentId,
            'attempt_number' => $attemptNumber,
            'score' => $score,
            'total' => $total,
            'answers_data' => ['answers' => $stored],
            'started_at' => $data['started_at'] ?? null,
            'completed_at' => now(),
        ]);

        return response()->json([
            'attempt_id' => $attempt->id,
            'quiz_id' => $quiz->quiz_id,
            'quiz_title' => $quiz->title,
            'score' => $score,
            'total' => $total,
            'percentage' => $total > 0 ? (int) round($score / $total * 100) : 0,
            'attempt_number' => $attempt->attempt_number,
            'started_at' => $attempt->started_at,
            'completed_at' => $attempt->completed_at,
            'questions' => $review,
        ], 201);
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
