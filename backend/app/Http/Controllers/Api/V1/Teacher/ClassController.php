<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClassController extends Controller
{
    public function index(Request $request)
    {
        $classes = Classes::where('teacher_id', $request->user()->id)
            ->withCount(['students', 'assignments'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($classes);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'code_expires_in_hours' => 'nullable|integer|min:1|max:8760',
        ]);

        $code = $this->generateUniqueCode();

        $expiresAt = null;
        if (!empty($data['code_expires_in_hours'])) {
            $expiresAt = now()->addHours((int)$data['code_expires_in_hours']);
        }

        $class = Classes::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'teacher_id' => $request->user()->id,
            'code' => $code,
            'code_expires_at' => $expiresAt,
        ]);

        return response()->json($class->loadCount(['students', 'assignments']), 201);
    }

    public function show(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id && $request->user()->role?->title !== 'admin') {
            abort(403);
        }

        $class->load(['students' => function ($q) {
            $q->orderBy('class_student.joined_at', 'desc');
        }, 'pendingStudents', 'assignments']);

        return response()->json($class);
    }

    public function update(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $class->update($data);
        return response()->json($class);
    }

    public function destroy(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);
        $class->delete();
        return response()->json(['message' => 'Class deleted.']);
    }

    public function regenerateCode(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'expires_in_hours' => 'nullable|integer|min:1|max:8760',
        ]);

        $class->update([
            'code' => $this->generateUniqueCode(),
            'code_expires_at' => !empty($data['expires_in_hours'])
                ? now()->addHours((int)$data['expires_in_hours'])
                : now()->addHours(24),
        ]);

        return response()->json($class);
    }

    public function students(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $class->load(['students' => function ($q) {
            $q->orderBy('class_student.joined_at', 'desc');
        }]);

        return response()->json($class->students);
    }

    public function addStudent(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'email' => 'required|string|email|exists:users,email',
        ]);

        $student = User::where('email', $data['email'])->first();

        if (!$student->role || $student->role->title !== 'student') {
            return response()->json(['message' => 'User is not a student.'], 422);
        }

        $exists = ClassStudent::where('class_id', $class->id)
            ->where('student_id', $student->id)
            ->first();

        if ($exists) {
            if ($exists->status === 'active') {
                return response()->json(['message' => 'Student already in class.'], 422);
            }
            $exists->update(['status' => 'active', 'added_by' => $request->user()->id]);
        } else {
            ClassStudent::create([
                'class_id' => $class->id,
                'student_id' => $student->id,
                'status' => 'active',
                'joined_by' => 'manual',
                'added_by' => $request->user()->id,
            ]);
        }

        Notification::create([
            'user_id' => $student->id,
            'type' => 'class_invite',
            'title' => 'Added to class',
            'body' => "You have been added to the class \"{$class->name}\".",
            'data' => ['class_id' => $class->id, 'type' => 'added'],
        ]);

        return response()->json(['message' => 'Student added.']);
    }

    public function removeStudent(Request $request, Classes $class, $studentId)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        ClassStudent::where('class_id', $class->id)
            ->where('student_id', $studentId)
            ->delete();

        return response()->json(['message' => 'Student removed.']);
    }

    public function pending(Request $request, Classes $class)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $class->load('pendingStudents');
        return response()->json($class->pendingStudents);
    }

    public function approve(Request $request, Classes $class, $studentId)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        $entry = ClassStudent::where('class_id', $class->id)
            ->where('student_id', $studentId)
            ->where('status', 'pending')
            ->firstOrFail();

        $entry->update(['status' => 'active']);

        Notification::create([
            'user_id' => $studentId,
            'type' => 'class_approved',
            'title' => 'Class request approved',
            'body' => "Your request to join \"{$class->name}\" has been approved.",
            'data' => ['class_id' => $class->id],
        ]);

        return response()->json(['message' => 'Student approved.']);
    }

    public function reject(Request $request, Classes $class, $studentId)
    {
        if ($class->teacher_id !== $request->user()->id) abort(403);

        ClassStudent::where('class_id', $class->id)
            ->where('student_id', $studentId)
            ->where('status', 'pending')
            ->delete();

        return response()->json(['message' => 'Request rejected.']);
    }

    private function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Classes::where('code', $code)->exists());
        return $code;
    }
}
