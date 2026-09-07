<?php

namespace App\Policies;

use App\Models\Assignment;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class QuizPolicy
{
    public function viewAny(User $user): Response
    {
        return Response::allow();
    }

    public function view(?User $user, Quiz $quiz): Response
    {
        if ($quiz->is_public) {
            return Response::allow();
        }

        if ($user && $quiz->author_id === $user->id) {
            return Response::allow();
        }

        if ($user) {
            $hasAssignment = Assignment::where('quiz_id', $quiz->quiz_id)
                ->whereHas('class', function ($q) use ($user) {
                    $q->whereHas('students', function ($sq) use ($user) {
                        $sq->where('student_id', $user->id)->where('status', 'active');
                    });
                })->exists();

            if ($hasAssignment) return Response::allow();
        }

        return Response::deny('You do not have permission to view this quiz.');
    }

    public function create(User $user): Response
    {
        return Response::allow();
    }

    public function update(User $user, Quiz $quiz): Response
    {
        return $quiz->author_id === $user->id
            ? Response::allow()
            : Response::deny('You do not have permission to update this quiz.');
    }

    public function delete(User $user, Quiz $quiz): Response
    {
        return $quiz->author_id === $user->id
            ? Response::allow()
            : Response::deny('You do not have permission to delete this quiz.');
    }
}
