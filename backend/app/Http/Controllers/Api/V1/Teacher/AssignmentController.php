<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Classes;
use App\Models\Notification;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function index(Request $request)
    {
        $assignments = Assignment::where('teacher_id', $request->user()->id)
            ->with(['class:id,name', 'quiz:quiz_id,title'])
            ->withCount(['attempts'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'class_id' => 'required|string|exists:classes,id',
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

        $assignment = Assignment::create([
            'class_id' => $data['class_id'],
            'quiz_id' => $data['quiz_id'],
            'teacher_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'max_attempts' => $data['max_attempts'] ?? 1,
            'time_limit_minutes' => $data['time_limit_minutes'] ?? null,
            'opens_at' => $data['opens_at'] ?? null,
            'due_at' => $data['due_at'] ?? null,
        ]);

        $students = $class->students;
        foreach ($students as $student) {
            Notification::create([
                'user_id' => $student->id,
                'type' => 'assignment_new',
                'title' => 'New assignment',
                'body' => "New assignment \"{$assignment->title}\" in class \"{$class->name}\".",
                'data' => ['assignment_id' => $assignment->id, 'class_id' => $class->id],
            ]);
        }

        return response()->json($assignment->load(['class:id,name', 'quiz:quiz_id,title']), 201);
    }

    public function show(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        $assignment->load(['class:id,name', 'quiz', 'attempts.student:id,first_name,last_name,email']);
        return response()->json($assignment);
    }

    public function update(Request $request, Assignment $assignment)
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:2000',
            'max_attempts' => 'nullable|integer|min:0|max:100',
            'time_limit_minutes' => 'nullable|integer|min:1|max:600',
            'opens_at' => 'nullable|date',
            'due_at' => 'nullable|date|after:opens_at',
        ]);

        $assignment->update($data);
        return response()->json($assignment->load(['class:id,name', 'quiz:quiz_id,title']));
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
            $best = $studentAttempts->sortByDesc('score')->first();
            return [
                'student' => $student,
                'attempts_count' => $studentAttempts->count(),
                'best_score' => (float)$best->score,
                'best_total' => (int)$best->total,
                'best_percentage' => $best->total > 0 ? round(($best->score / $best->total) * 100, 1) : 0,
                'attempts' => $studentAttempts->map(fn($a) => [
                    'attempt_number' => $a->attempt_number,
                    'score' => (float)$a->score,
                    'total' => (int)$a->total,
                    'percentage' => $a->total > 0 ? round(($a->score / $a->total) * 100, 1) : 0,
                    'completed_at' => $a->completed_at,
                ]),
            ];
        })->values();

        return response()->json([
            'assignment' => $assignment->load('quiz:quiz_id,title'),
            'results' => $results,
        ]);
    }
}
