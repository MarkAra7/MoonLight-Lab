<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Classes;
use App\Models\Notification;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssignmentController extends Controller
{
    public function index(Request $request)
    {
        $assignments = Assignment::where('teacher_id', $request->user()->id)
            ->with(['class:id,name', 'quiz:quiz_id,title', 'student:id,first_name,last_name,email'])
            ->withCount(['attempts'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'class_id' => 'required|string|exists:classes,id',
            'student_id' => 'nullable|string|exists:users,id',
            'quiz_id' => 'required|string|exists:quizzes,quiz_id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'max_attempts' => 'nullable|integer|min:0|max:100',
            'time_limit_minutes' => 'nullable|integer|min:1|max:600',
            'opens_at' => 'nullable|date',
            'due_at' => 'nullable|date|after:opens_at',
        ]);

        $class = Classes::findOrFail($data['class_id']);
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $quiz = Quiz::findOrFail($data['quiz_id']);
        // An assignment grants the whole class access to the quiz, so a teacher
        // must not be able to use it to expose another author's private draft.
        if ($quiz->author_id !== $request->user()->id) abort(403);

        if (!empty($data['student_id']) && ! $this->studentIsInClass($class, $data['student_id'])) {
            return response()->json(['message' => 'That student is not in this class.'], 422);
        }

        $assignment = Assignment::create([
            'class_id' => $data['class_id'],
            'student_id' => $data['student_id'] ?? null,
            'quiz_id' => $data['quiz_id'],
            'teacher_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'max_attempts' => $data['max_attempts'] ?? 1,
            'time_limit_minutes' => $data['time_limit_minutes'] ?? null,
            'opens_at' => $data['opens_at'] ?? null,
            'due_at' => $data['due_at'] ?? null,
        ]);

        $students = !empty($data['student_id'])
            ? $class->students()->whereKey($data['student_id'])->get()
            : $class->students;

        foreach ($students as $student) {
            Notification::create([
                'user_id' => $student->id,
                'type' => 'assignment_new',
                'title' => 'New assignment',
                'body' => "New assignment \"{$assignment->title}\" in class \"{$class->name}\".",
                'data' => ['assignment_id' => $assignment->id, 'class_id' => $class->id],
            ]);
        }

        return response()->json(
            $assignment->load(['class:id,name', 'quiz:quiz_id,title', 'student:id,first_name,last_name,email']),
            201
        );
    }

    public function show(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        $assignment->load([
            'class:id,name',
            'student:id,first_name,last_name,email',
            'quiz',
            'attempts.student:id,first_name,last_name,email',
        ]);
        return response()->json($assignment);
    }

    public function update(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'student_id' => 'sometimes|nullable|string|exists:users,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:2000',
            'max_attempts' => 'nullable|integer|min:0|max:100',
            'time_limit_minutes' => 'nullable|integer|min:1|max:600',
            'opens_at' => 'nullable|date',
            'due_at' => 'nullable|date|after:opens_at',
        ]);

        if (!empty($data['student_id']) && ! $this->studentIsInClass($assignment->class, $data['student_id'])) {
            return response()->json(['message' => 'That student is not in this class.'], 422);
        }

        $assignment->update($data);
        return response()->json(
            $assignment->load(['class:id,name', 'quiz:quiz_id,title', 'student:id,first_name,last_name,email'])
        );
    }

    public function destroy(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);
        $assignment->delete();
        return response()->json(['message' => 'Assignment deleted.']);
    }

    public function results(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        $attempts = QuizAttempt::where('assignment_id', $assignment->id)
            ->with('student:id,first_name,last_name,email')
            ->orderBy('student_id')
            ->orderBy('attempt_number')
            ->get()
            ->groupBy('student_id');

        $results = $attempts->map(function ($studentAttempts, $studentId) {
            $student = $studentAttempts->first()->student;
            $best = $studentAttempts->sortByDesc(fn (QuizAttempt $attempt) => $attempt->finalScore())->first();
            return [
                'student' => $student,
                'attempts_count' => $studentAttempts->count(),
                'best_score' => $best->finalScore(),
                'best_total' => (int)$best->total,
                'best_percentage' => $best->finalPercentage(),
                'attempts' => $studentAttempts->map(fn($a) => [
                    'id' => $a->id,
                    'attempt_number' => $a->attempt_number,
                    'score' => (float)$a->score,
                    'teacher_score' => $a->teacher_score !== null ? (float)$a->teacher_score : null,
                    'final_score' => $a->finalScore(),
                    'total' => (int)$a->total,
                    'percentage' => $a->finalPercentage(),
                    'teacher_feedback' => $a->teacher_feedback,
                    'graded_at' => $a->graded_at,
                    'completed_at' => $a->completed_at,
                ]),
            ];
        })->values();

        return response()->json([
            'assignment' => $assignment->load(['quiz:quiz_id,title', 'student:id,first_name,last_name,email']),
            'results' => $results,
        ]);
    }

    /**
     * Downloads the results as a CSV file. Every attempt gets its own row and
     * enrolled students without attempts are kept as an empty row, so the file
     * matches the class list instead of silently dropping people.
     */
    public function export(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        $assignment->load(['class:id,name', 'quiz:quiz_id,title', 'student:id,first_name,last_name,email']);

        $attempts = QuizAttempt::where('assignment_id', $assignment->id)
            ->with('student:id,first_name,last_name,email')
            ->orderBy('attempt_number')
            ->get()
            ->groupBy('student_id');

        // A personal assignment should produce a one-student export instead of
        // exposing the whole class list.
        $classStudents = $assignment->student
            ? collect([$assignment->student])
            : ($assignment->class
                ? $assignment->class->students()
                    ->orderBy('last_name')
                    ->orderBy('first_name')
                    ->get(['users.id', 'users.first_name', 'users.last_name', 'users.email'])
                : collect());

        // A student may have left the class after submitting, so keep their
        // attempts in the export instead of losing the grades.
        $students = $classStudents->keyBy('id')->union(
            $attempts
                ->map(fn ($rows) => $rows->first()->student)
                ->filter()
                ->keyBy('id')
        )->sortBy(fn ($student) => mb_strtolower(trim(
            ($student->last_name ?? '').' '.($student->first_name ?? '')
        )));

        $callback = function () use ($students, $attempts) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Student',
                'Email',
                'Attempt',
                'Automatic score',
                'Teacher score',
                'Final score',
                'Total',
                'Percentage',
                'Completed at',
                'Graded at',
                'Teacher feedback',
            ]);

            foreach ($students as $student) {
                $studentAttempts = $attempts->get($student->id, collect());
                $name = trim(($student->first_name ?? '').' '.($student->last_name ?? ''))
                    ?: $student->email;

                if ($studentAttempts->isEmpty()) {
                    fputcsv($out, [$name, $student->email, '', '', '', '', '', '', '', '', '']);
                    continue;
                }

                foreach ($studentAttempts as $attempt) {
                    fputcsv($out, [
                        $name,
                        $student->email,
                        $attempt->attempt_number,
                        (float) $attempt->score,
                        $attempt->teacher_score !== null ? (float) $attempt->teacher_score : '',
                        $attempt->finalScore(),
                        (int) $attempt->total,
                        $attempt->finalPercentage(),
                        $attempt->completed_at?->toDateTimeString() ?? '',
                        $attempt->graded_at?->toDateTimeString() ?? '',
                        $attempt->teacher_feedback ?? '',
                    ]);
                }
            }

            fclose($out);
        };

        $filename = (Str::slug($assignment->title) ?: 'assignment').'-results.csv';

        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Shows one attempt with the student's answers next to the correct ones,
     * so the teacher has everything needed to grade it manually.
     */
    public function attempt(Request $request, Assignment $assignment, QuizAttempt $attempt)
    {
        $this->authorizeAttempt($request, $assignment, $attempt);

        return response()->json($this->attemptPayload($assignment, $attempt));
    }

    /**
     * Stores the teacher's manual score and feedback. The automatic score is
     * kept, so the original result is never lost.
     */
    public function gradeAttempt(Request $request, Assignment $assignment, QuizAttempt $attempt)
    {
        $this->authorizeAttempt($request, $assignment, $attempt);

        $data = $request->validate([
            'teacher_score' => ['required', 'numeric', 'min:0', 'max:'.$attempt->total],
            'teacher_feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        $attempt->update([
            'teacher_score' => $data['teacher_score'],
            'teacher_feedback' => $data['teacher_feedback'] ?? null,
            'graded_by_id' => $request->user()->id,
            'graded_at' => now(),
        ]);

        return response()->json($this->attemptPayload($assignment, $attempt->fresh()));
    }

    private function authorizeAttempt(Request $request, Assignment $assignment, QuizAttempt $attempt): void
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        if ($attempt->assignment_id !== $assignment->id) abort(404);
    }

    private function attemptPayload(Assignment $assignment, QuizAttempt $attempt): array
    {
        $attempt->load([
            'student:id,first_name,last_name,email',
            'grader:id,name,first_name,last_name',
        ]);

        $questions = $assignment->quiz
            ->questions()
            ->with('answers')
            ->orderBy('display_order')
            ->get()
            ->keyBy('question_id');

        $stored = collect($attempt->answers_data['answers'] ?? []);
        $storedByQuestion = $stored->keyBy('question_id');

        $review = $questions->map(function ($question, $questionId) use ($storedByQuestion) {
            $row = $storedByQuestion->get($questionId) ?? [];
            $scorable = $question->question_type !== 'theory';

            $givenIds = array_map('strval', (array) ($row['answer_ids'] ?? []));
            $givenText = trim((string) ($row['text'] ?? ''));

            return [
                'question_id' => $question->question_id,
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'scorable' => $scorable,
                'is_correct' => $row['is_correct'] ?? null,
                'given_answer' => $this->answerTexts($question, $givenIds),
                'given_text' => $givenText,
                'correct_answer' => $question->answers
                    ->where('is_correct', true)
                    ->pluck('answer_text')
                    ->implode(', '),
                'correct_text' => $question->question_type === 'text_input' ? $question->correct_text : null,
            ];
        })->values();

        return [
            'attempt' => [
                'id' => $attempt->id,
                'attempt_number' => $attempt->attempt_number,
                'auto_score' => (float) $attempt->score,
                'teacher_score' => $attempt->teacher_score !== null ? (float) $attempt->teacher_score : null,
                'final_score' => $attempt->finalScore(),
                'total' => (int) $attempt->total,
                'percentage' => $attempt->finalPercentage(),
                'teacher_feedback' => $attempt->teacher_feedback,
                'graded_at' => $attempt->graded_at,
                'graded_by' => $attempt->grader?->name,
                'completed_at' => $attempt->completed_at,
                'student' => $attempt->student,
            ],
            'questions' => $review,
        ];
    }

    /** Turns stored answer ids into readable text for the grading screen. */
    private function answerTexts($question, array $ids): string
    {
        if ($ids === []) {
            return '';
        }

        return $question->answers
            ->whereIn('answer_id', $ids)
            ->pluck('answer_text')
            ->implode(', ');
    }

    private function studentIsInClass(Classes $class, string $studentId): bool
    {
        return $class->students()->whereKey($studentId)->exists();
    }
}
