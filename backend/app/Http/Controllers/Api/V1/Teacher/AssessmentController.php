<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAttempt;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssessmentController extends Controller
{
    public function index(Request $request)
    {
        $assessments = Assessment::where('teacher_id', $request->user()->id)
            ->withCount('questions')
            ->withCount('assignments')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($assessments);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'status' => 'nullable|string|in:draft,published',
            'time_limit_minutes' => 'nullable|integer|min:1|max:600',
            'max_attempts' => 'nullable|integer|min:0|max:100',
            'opens_at' => 'nullable|date',
            'due_at' => 'nullable|date|after:opens_at',
        ]);

        $assessment = Assessment::create([
            'teacher_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'time_limit_minutes' => $data['time_limit_minutes'] ?? null,
            'max_attempts' => $data['max_attempts'] ?? 1,
            'opens_at' => $data['opens_at'] ?? null,
            'due_at' => $data['due_at'] ?? null,
        ]);

        return response()->json($this->payload($assessment), 201);
    }

    public function show(Request $request, Assessment $assessment)
    {
        $this->authorizeOwner($request, $assessment);

        return response()->json($this->payload($assessment));
    }

    public function update(Request $request, Assessment $assessment)
    {
        $this->authorizeOwner($request, $assessment);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:2000',
            'status' => 'nullable|string|in:draft,published',
            'time_limit_minutes' => 'nullable|integer|min:1|max:600',
            'max_attempts' => 'nullable|integer|min:0|max:100',
            'opens_at' => 'nullable|date',
            'due_at' => 'nullable|date|after:opens_at',
        ]);

        $assessment->update($data);

        return response()->json($this->payload($assessment->fresh()));
    }

    public function destroy(Request $request, Assessment $assessment)
    {
        $this->authorizeOwner($request, $assessment);

        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted.']);
    }

    /** One row per student with their best attempt and the full attempt list. */
    public function results(Request $request, Assessment $assessment)
    {
        $this->authorizeOwner($request, $assessment);

        $attempts = AssessmentAttempt::where('assessment_id', $assessment->assessment_id)
            ->with('student:id,first_name,last_name,email')
            ->orderBy('student_id')
            ->orderBy('attempt_number')
            ->get()
            ->groupBy('student_id');

        $results = $attempts->map(function ($rows) {
            $best = $rows->sortByDesc(fn (AssessmentAttempt $attempt) => $attempt->finalScore())->first();

            return [
                'student' => $best->student,
                'attempts_count' => $rows->count(),
                'best_score' => $best->finalScore(),
                'best_total' => (int) $best->total,
                'best_percentage' => $best->finalPercentage(),
                'attempts' => $rows->map(fn (AssessmentAttempt $attempt) => [
                    'id' => $attempt->id,
                    'attempt_number' => $attempt->attempt_number,
                    'score' => (float) $attempt->score,
                    'teacher_score' => $attempt->teacher_score !== null ? (float) $attempt->teacher_score : null,
                    'final_score' => $attempt->finalScore(),
                    'total' => (int) $attempt->total,
                    'percentage' => $attempt->finalPercentage(),
                    'teacher_feedback' => $attempt->teacher_feedback,
                    'graded_at' => $attempt->graded_at,
                    'completed_at' => $attempt->completed_at,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'assessment' => $assessment->only(['assessment_id', 'title', 'description', 'status']),
            'results' => $results,
        ]);
    }

    /** Exports only the students the assessment was assigned to. */
    public function export(Request $request, Assessment $assessment)
    {
        $this->authorizeOwner($request, $assessment);

        $attempts = AssessmentAttempt::where('assessment_id', $assessment->assessment_id)
            ->with('student:id,first_name,last_name,email')
            ->orderBy('attempt_number')
            ->get()
            ->groupBy('student_id');

        $students = $assessment->assignments()
            ->with('class.students:id,first_name,last_name,email')
            ->get()
            ->flatMap(function ($assignment) {
                if ($assignment->student) {
                    return collect([$assignment->student]);
                }

                return $assignment->class ? $assignment->class->students : collect();
            })
            ->keyBy('id')
            ->union($attempts->map(fn ($rows) => $rows->first()->student)->filter()->keyBy('id'))
            ->sortBy(fn ($student) => mb_strtolower(trim(
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
                $rows = $attempts->get($student->id, collect());
                $name = trim(($student->first_name ?? '').' '.($student->last_name ?? '')) ?: $student->email;

                if ($rows->isEmpty()) {
                    fputcsv($out, [$name, $student->email, '', '', '', '', '', '', '', '', '']);
                    continue;
                }

                foreach ($rows as $attempt) {
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

        return response()->streamDownload(
            $callback,
            (Str::slug($assessment->title) ?: 'assessment').'-results.csv',
            ['Content-Type' => 'text/csv; charset=UTF-8']
        );
    }

    public function attempt(Request $request, Assessment $assessment, AssessmentAttempt $attempt)
    {
        $this->authorizeAttempt($request, $assessment, $attempt);

        $attempt->load([
            'student:id,first_name,last_name,email',
            'grader:id,name,first_name,last_name',
        ]);

        return response()->json([
            'attempt' => $this->attemptSummary($attempt),
            'questions' => $this->review($assessment, $attempt),
        ]);
    }

    public function gradeAttempt(Request $request, Assessment $assessment, AssessmentAttempt $attempt)
    {
        $this->authorizeAttempt($request, $assessment, $attempt);

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

        return response()->json([
            'attempt' => $this->attemptSummary($attempt->fresh()),
            'questions' => $this->review($assessment, $attempt->fresh()),
        ]);
    }

    private function authorizeOwner(Request $request, Assessment $assessment): void
    {
        if ($assessment->teacher_id !== $request->user()->id) abort(403);
    }

    private function authorizeAttempt(Request $request, Assessment $assessment, AssessmentAttempt $attempt): void
    {
        $this->authorizeOwner($request, $assessment);

        if ($attempt->assessment_id !== $assessment->assessment_id) abort(404);
    }

    private function payload(Assessment $assessment): array
    {
        $assessment->load([
            'questions' => fn ($query) => $query->with('answers')->orderBy('display_order'),
        ]);

        return [
            'assessment' => $assessment->only([
                'assessment_id', 'teacher_id', 'title', 'description', 'status',
                'time_limit_minutes', 'max_attempts', 'opens_at', 'due_at',
                'created_at', 'updated_at',
            ]),
            'questions' => $assessment->questions,
            'total_points' => $assessment->totalPoints(),
        ];
    }

    private function attemptSummary(AssessmentAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'attempt_number' => $attempt->attempt_number,
            'auto_score' => (float) $attempt->score,
            'teacher_score' => $attempt->teacher_score !== null ? (float) $attempt->teacher_score : null,
            'final_score' => $attempt->finalScore(),
            'total' => (int) $attempt->total,
            'percentage' => $attempt->finalPercentage(),
            'teacher_feedback' => $attempt->teacher_feedback,
            'graded_by' => $attempt->grader?->name,
            'graded_at' => $attempt->graded_at,
            'completed_at' => $attempt->completed_at,
            'student' => $attempt->student,
        ];
    }

    /** Question texts, expected answers and the student's work for manual grading. */
    private function review(Assessment $assessment, AssessmentAttempt $attempt): array
    {
        $stored = collect($attempt->answers_data['answers'] ?? [])->keyBy('question_id');

        return $assessment->questions()
            ->with('answers')
            ->orderBy('display_order')
            ->get()
            ->map(function ($question) use ($stored) {
                $given = $stored->get($question->question_id, []);

                return [
                    'question_id' => $question->question_id,
                    'question_text' => $question->question_text,
                    'question_type' => $question->question_type,
                    'points' => (int) $question->points,
                    'correct_answers' => $question->answers->where('is_correct', true)->pluck('answer_text')->values(),
                    'correct_text' => $question->correct_text,
                    'given_answer_ids' => $given['answer_ids'] ?? [],
                    'given_text' => $given['text'] ?? '',
                    'given_code' => $given['code'] ?? '',
                    'earned' => $given['earned'] ?? 0,
                    'is_correct' => $given['is_correct'] ?? null,
                ];
            })
            ->all();
    }
}
