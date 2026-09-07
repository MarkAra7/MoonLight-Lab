<?php

namespace App\Http\Controllers\Api\V1\QuizStats;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\Rating;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function index(Quiz $quiz)
    {
        $ratings = Rating::where('quiz_id', $quiz->quiz_id)
            ->with('user:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => [
                'id' => $r->rating_id,
                'user' => $r->user ? "{$r->user->first_name} {$r->user->last_name}" : 'Unknown',
                'rating' => (int)$r->rating,
                'created_at' => $r->created_at,
            ]);

        return response()->json([
            'average' => round($ratings->avg('rating') ?? 0, 1),
            'count' => $ratings->count(),
            'ratings' => $ratings,
        ]);
    }

    public function store(Request $request, Quiz $quiz)
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $existing = Rating::where('quiz_id', $quiz->quiz_id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            $existing->update(['rating' => $data['rating']]);
            return response()->json(['message' => 'Rating updated.', 'rating' => $existing]);
        }

        $rating = Rating::create([
            'quiz_id' => $quiz->quiz_id,
            'user_id' => $request->user()->id,
            'rating' => $data['rating'],
        ]);

        return response()->json(['message' => 'Rating added.', 'rating' => $rating], 201);
    }

    public function userRating(Request $request, Quiz $quiz)
    {
        $rating = Rating::where('quiz_id', $quiz->quiz_id)
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json(['rating' => $rating ? (int)$rating->rating : null]);
    }
}
