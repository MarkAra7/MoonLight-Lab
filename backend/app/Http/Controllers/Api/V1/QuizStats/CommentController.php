<?php

namespace App\Http\Controllers\Api\V1\QuizStats;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Quiz;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Quiz $quiz)
    {
        $comments = Comment::where('quiz_id', $quiz->quiz_id)
            ->whereNull('parent_id')
            ->with('user:id,first_name,last_name,username', 'replies.user:id,first_name,last_name,username')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($c) => [
                'id' => $c->comment_id,
                'user' => $c->user ? "{$c->user->first_name} {$c->user->last_name}" : 'Unknown',
                'username' => $c->user?->username,
                'body' => $c->body,
                'created_at' => $c->created_at,
                'replies' => $c->replies->map(fn($r) => [
                    'id' => $r->comment_id,
                    'user' => $r->user ? "{$r->user->first_name} {$r->user->last_name}" : 'Unknown',
                    'username' => $r->user?->username,
                    'body' => $r->body,
                    'created_at' => $r->created_at,
                ]),
            ]);

        return response()->json($comments);
    }

    public function store(Request $request, Quiz $quiz)
    {
        $data = $request->validate([
            'body' => 'required|string|max:2000',
            'parent_id' => 'nullable|string|exists:comments,comment_id',
        ]);

        $comment = Comment::create([
            'quiz_id' => $quiz->quiz_id,
            'user_id' => $request->user()->id,
            'parent_id' => $data['parent_id'] ?? null,
            'body' => $data['body'],
        ]);

        $comment->load('user:id,first_name,last_name,username');

        return response()->json([
            'id' => $comment->comment_id,
            'user' => $comment->user ? "{$comment->user->first_name} {$comment->user->last_name}" : 'Unknown',
            'username' => $comment->user?->username,
            'body' => $comment->body,
            'created_at' => $comment->created_at,
        ], 201);
    }

    public function destroy(Request $request, Comment $comment)
    {
        if ($comment->user_id !== $request->user()->id) {
            abort(403);
        }
        $comment->delete();
        return response()->json(['message' => 'Comment deleted.']);
    }
}
