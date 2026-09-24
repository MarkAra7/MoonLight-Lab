<?php

namespace App\Http\Controllers\Api\V1\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuizRequest;
use App\Http\Requests\UpdateQuizRequest;
use App\Http\Resources\QuizResource;
use App\Models\Quiz;
use App\Models\QuizStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class QuizController extends Controller
{
    public function index()
    {
        return QuizResource::collection(Quiz::with(['category', 'media', 'author.avatar'])
            ->withCount('questions')
            ->where('is_public', true)
            ->whereHas('quizStatus', fn($q) => $q->where('status', 'published'))
            ->latest()
            ->get());
    }

    public function store(StoreQuizRequest $request)
    {
        $status = QuizStatus::firstOrCreate(['status' => 'draft']);

        $quiz = Quiz::create([
            'title' => $request->title,
            'description' => $request->description,
            'author_id' => $request->user()->id,
            'quiz_status_id' => $status->quiz_status_id,
            'category_id' => $request->category_id,
            'media_id' => $request->media_id,
            'is_public' => $request->boolean('is_public'),
        ]);

        return response()->json(new QuizResource($quiz->load(['category', 'media', 'author.avatar'])), 201);
    }

    public function show(Quiz $quiz, Request $request)
    {
        Gate::authorize('view', $quiz);

        $quiz->load(['category', 'media', 'author.avatar']);
        $quiz->load(['questions' => function ($q) use ($request) {
            $q->visibleTo($request->user())->with('answers')->orderBy('display_order');
        }]);

        return new QuizResource($quiz);
    }

    public function myQuizzes(Request $request)
    {
        return QuizResource::collection(Quiz::with(['category', 'media', 'quizStatus'])
            ->withCount('questions')
            ->where('author_id', $request->user()->id)
            ->latest()
            ->get());
    }

    public function update(UpdateQuizRequest $request, Quiz $quiz)
    {
        Gate::authorize('update', $quiz);

        $quiz->update($request->validated());

        return response()->json(new QuizResource($quiz->load(['category', 'media', 'author.avatar'])));
    }

    public function destroy(Quiz $quiz)
    {
        Gate::authorize('delete', $quiz);

        $quiz->delete();

        return response()->noContent();
    }
}
