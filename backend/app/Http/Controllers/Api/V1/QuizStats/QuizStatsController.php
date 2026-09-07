<?php

namespace App\Http\Controllers\Api\V1\QuizStats;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Rating;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class QuizStatsController extends Controller
{
    public function stats(Request $request, Quiz $quiz)
    {
        Gate::authorize('view', $quiz);

        $quiz->load(['category', 'media', 'author', 'questions.answers']);

        $totalAttempts = QuizAttempt::where('quiz_id', $quiz->quiz_id)->count();
        $uniqueStudents = QuizAttempt::where('quiz_id', $quiz->quiz_id)
            ->distinct('student_id')->count('student_id');

        $allAttempts = QuizAttempt::where('quiz_id', $quiz->quiz_id)
            ->select('score', 'total', 'answers_data')
            ->get();

        $avgPercentage = 0;
        $scoreDistribution = [0, 0, 0, 0, 0];
        $questionStats = [];

        if ($allAttempts->isNotEmpty()) {
            $percentages = $allAttempts->map(function ($a) {
                return $a->total > 0 ? ($a->score / $a->total) * 100 : 0;
            });
            $avgPercentage = round($percentages->avg(), 1);

            foreach ($percentages as $pct) {
                if ($pct < 20) $scoreDistribution[0]++;
                elseif ($pct < 40) $scoreDistribution[1]++;
                elseif ($pct < 60) $scoreDistribution[2]++;
                elseif ($pct < 80) $scoreDistribution[3]++;
                else $scoreDistribution[4]++;
            }

            $questions = $quiz->questions;
            foreach ($questions as $q) {
                $correct = 0;
                $total = 0;
                foreach ($allAttempts as $a) {
                    $data = $a->answers_data;
                    if ($data && isset($data[$q->question_id])) {
                        $total++;
                        if ($data[$q->question_id]['selected'] === $data[$q->question_id]['correct']) {
                            $correct++;
                        }
                    }
                }
                $questionStats[] = [
                    'question_id' => $q->question_id,
                    'question_text' => $q->question_text,
                    'total_answers' => $total,
                    'correct_count' => $correct,
                    'correct_percentage' => $total > 0 ? round(($correct / $total) * 100, 1) : 0,
                ];
            }
        }

        $ratingsSummary = [
            'average' => round(Rating::where('quiz_id', $quiz->quiz_id)->avg('rating') ?? 0, 1),
            'count' => Rating::where('quiz_id', $quiz->quiz_id)->count(),
        ];

        $commentsCount = Comment::where('quiz_id', $quiz->quiz_id)->count();

        $recentAttempts = QuizAttempt::where('quiz_id', $quiz->quiz_id)
            ->with('student:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($a) => [
                'student_name' => $a->student ? "{$a->student->first_name} {$a->student->last_name}" : 'Unknown',
                'score' => (float)$a->score,
                'total' => (int)$a->total,
                'percentage' => $a->total > 0 ? round(($a->score / $a->total) * 100, 1) : 0,
                'completed_at' => $a->completed_at,
            ]);

        return response()->json([
            'quiz' => $quiz->only(['quiz_id', 'title', 'description', 'difficulty', 'time_limit', 'views', 'average_score', 'is_public']),
            'author' => $quiz->author ? $quiz->author->only(['id', 'first_name', 'last_name']) : null,
            'category' => $quiz->category ? $quiz->category->only(['name']) : null,
            'questions_count' => $quiz->questions->count(),
            'stats' => [
                'views' => (int)$quiz->views,
                'total_attempts' => $totalAttempts,
                'unique_students' => $uniqueStudents,
                'average_percentage' => $avgPercentage,
                'score_distribution' => [
                    ['range' => '0-20%', 'count' => $scoreDistribution[0]],
                    ['range' => '20-40%', 'count' => $scoreDistribution[1]],
                    ['range' => '40-60%', 'count' => $scoreDistribution[2]],
                    ['range' => '60-80%', 'count' => $scoreDistribution[3]],
                    ['range' => '80-100%', 'count' => $scoreDistribution[4]],
                ],
                'rating' => $ratingsSummary,
                'comments_count' => $commentsCount,
            ],
            'question_stats' => $questionStats,
            'recent_attempts' => $recentAttempts,
        ]);
    }

    public function incrementViews(Request $request, Quiz $quiz)
    {
        $quiz->increment('views');
        return response()->json(['views' => $quiz->fresh()->views]);
    }
}
