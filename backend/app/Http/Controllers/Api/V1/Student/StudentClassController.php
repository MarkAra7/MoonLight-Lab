<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Assignment;
use App\Models\Notification;
use Illuminate\Http\Request;

class StudentClassController extends Controller
{
    public function myClasses(Request $request)
    {
        $classes = Classes::whereHas('students', function ($q) use ($request) {
            $q->where('student_id', $request->user()->id)->where('status', 'active');
        })->withCount(['assignments', 'students'])->orderBy('created_at', 'desc')->get();

        return response()->json($classes);
    }

    public function classDetail(Request $request, Classes $class)
    {
        $isMember = ClassStudent::where('class_id', $class->id)
            ->where('student_id', $request->user()->id)
            ->where('status', 'active')
            ->exists();

        if (!$isMember) abort(403);

        $assignments = Assignment::where('class_id', $class->id)
            ->with('quiz:quiz_id,title')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($a) use ($request) {
                $attempts = $a->attempts()->where('student_id', $request->user()->id)->get();
                $best = $attempts->sortByDesc('score')->first();
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'quiz' => $a->quiz,
                    'max_attempts' => $a->max_attempts,
                    'attempts_made' => $attempts->count(),
                    'attempts_remaining' => $a->max_attempts === 0 ? -1 : max(0, $a->max_attempts - $attempts->count()),
                    'best_score' => $best ? (float)$best->score : null,
                    'best_total' => $best ? (int)$best->total : null,
                    'is_open' => $a->isOpen(),
                    'opens_at' => $a->opens_at,
                    'due_at' => $a->due_at,
                    'time_limit_minutes' => $a->time_limit_minutes,
                ];
            });

        return response()->json([
            'class' => $class->only(['id', 'name', 'description']),
            'assignments' => $assignments,
        ]);
    }

    public function join(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $class = Classes::where('code', strtoupper($data['code']))->first();

        if (!$class) {
            return response()->json(['message' => 'Invalid code.'], 404);
        }

        if (!$class->isCodeValid()) {
            return response()->json(['message' => 'Code has expired.'], 422);
        }

        if ($request->user()->role?->title !== 'student') {
            return response()->json(['message' => 'Only students can join classes.'], 403);
        }

        $existing = ClassStudent::where('class_id', $class->id)
            ->where('student_id', $request->user()->id)
            ->first();

        if ($existing && $existing->status === 'active') {
            return response()->json(['message' => 'Already a member of this class.'], 422);
        }

        if ($existing && $existing->status === 'pending') {
            return response()->json(['message' => 'Request already sent. Waiting for approval.'], 422);
        }

        ClassStudent::create([
            'class_id' => $class->id,
            'student_id' => $request->user()->id,
            'status' => 'pending',
            'joined_by' => 'code',
        ]);

        Notification::create([
            'user_id' => $class->teacher_id,
            'type' => 'join_request',
            'title' => 'New join request',
            'body' => "{$request->user()->first_name} {$request->user()->last_name} wants to join \"{$class->name}\".",
            'data' => ['class_id' => $class->id, 'student_id' => $request->user()->id],
        ]);

        return response()->json(['message' => 'Join request sent. Waiting for teacher approval.']);
    }
}
