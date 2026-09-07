<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\QuizAttempt;
use App\Models\Quiz;
use Illuminate\Http\Request;

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
        $attemptNumber = 1;

        if (!empty($data['assignment_id'])) {
            $assignment = Assignment::findOrFail($data['assignment_id']);
            $attemptNumber = $assignment->attempts()->where('student_id', $studentId)->count() + 1;

            if ($assignment->attemptsRemaining($studentId) <= 0) {
                return response()->json(['message' => 'No attempts remaining.'], 422);
            }
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
}
