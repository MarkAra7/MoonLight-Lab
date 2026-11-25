<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAssignment;
use App\Models\Classes;
use App\Models\Notification;
use Illuminate\Http\Request;

class AssessmentAssignmentController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            AssessmentAssignment::where('teacher_id', $request->user()->id)
                ->with(['class:id,name', 'assessment:assessment_id,title', 'student:id,first_name,last_name,email'])
                ->withCount('attempts')
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function show(Request $request, AssessmentAssignment $assignment)
    {
        $this->authorizeOwner($request, $assignment);

        return response()->json(
            $assignment->load([
                'class:id,name',
                'assessment:assessment_id,title',
                'student:id,first_name,last_name,email',
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'assessment_id' => 'required|string|exists:assessments,assessment_id',
            'class_id' => 'required|string|exists:classes,id',
            'student_id' => 'nullable|string|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'max_attempts' => 'nullable|integer|min:0|max:100',
            'time_limit_minutes' => 'nullable|integer|min:1|max:600',
            'opens_at' => 'nullable|date',
            'due_at' => 'nullable|date|after:opens_at',
        ]);

        $class = Classes::findOrFail($data['class_id']);
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $assessment = Assessment::findOrFail($data['assessment_id']);
        if ($assessment->teacher_id !== $request->user()->id) abort(403);

        if (!empty($data['student_id']) && ! $this->studentIsInClass($class, $data['student_id'])) {
            return response()->json(['message' => 'That student is not in this class.'], 422);
        }

        $assignment = AssessmentAssignment::create([
            'assessment_id' => $assessment->assessment_id,
            'class_id' => $class->id,
            'student_id' => $data['student_id'] ?? null,
            'teacher_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'max_attempts' => $data['max_attempts'] ?? $assessment->max_attempts,
            'time_limit_minutes' => $data['time_limit_minutes'] ?? $assessment->time_limit_minutes,
            'opens_at' => $data['opens_at'] ?? $assessment->opens_at,
            'due_at' => $data['due_at'] ?? $assessment->due_at,
        ]);

        $students = !empty($data['student_id'])
            ? $class->students()->whereKey($data['student_id'])->get()
            : $class->students;

        foreach ($students as $student) {
            Notification::create([
                'user_id' => $student->id,
                'type' => 'assessment_new',
                'title' => 'New assessment',
                'body' => "New assessment \"{$assignment->title}\" in class \"{$class->name}\".",
                'data' => ['assessment_assignment_id' => $assignment->id, 'class_id' => $class->id],
            ]);
        }

        return response()->json($assignment, 201);
    }

    public function update(Request $request, AssessmentAssignment $assignment)
    {
        $this->authorizeOwner($request, $assignment);

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

        return response()->json($assignment);
    }

    public function destroy(Request $request, AssessmentAssignment $assignment)
    {
        $this->authorizeOwner($request, $assignment);

        $assignment->delete();

        return response()->json(['message' => 'Assessment assignment deleted.']);
    }

    private function authorizeOwner(Request $request, AssessmentAssignment $assignment): void
    {
        if ($assignment->teacher_id !== $request->user()->id) abort(403);
    }

    private function studentIsInClass(Classes $class, string $studentId): bool
    {
        return $class->students()->whereKey($studentId)->exists();
    }
}
