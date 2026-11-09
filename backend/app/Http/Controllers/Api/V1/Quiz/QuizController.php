<?php

namespace App\Http\Controllers\Api\V1\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuizRequest;
use App\Http\Requests\UpdateQuizRequest;
use App\Http\Resources\QuizResource;
use App\Models\Answer;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class QuizController extends Controller
{
    public function index(Request $request)
    {
        return QuizResource::collection(Quiz::with(['category', 'media', 'author.avatar'])
            ->withCount('questions')
            ->where('is_public', true)
            ->whereHas('quizStatus', fn($q) => $q->where('status', 'published'))
            ->when($request->filled('author'), function ($query) use ($request) {
                $query->whereHas('author', fn($q) => $q->where('username', $request->input('author')));
            })
            ->when($request->filled('category'), fn($query) => $query->where('category_id', $request->input('category')))
            ->when($request->filled('search'), fn($query) => $query->where(fn($w) => $w
                ->where('title', 'like', '%'.$request->input('search').'%')
                ->orWhere('description', 'like', '%'.$request->input('search').'%')))
            ->latest()
            ->paginate($this->perPage($request)));
    }

    public function store(StoreQuizRequest $request)
    {
        $quiz = Quiz::create([
            'title' => $request->title,
            'description' => $request->description,
            'author_id' => $request->user()->id,
            'quiz_status_id' => $this->statusId($request->input('status', 'draft')),
            'category_id' => $request->category_id,
            'media_id' => $request->media_id,
            'language' => $request->language ?? 'en',
            'difficulty' => $request->difficulty,
            'time_limit' => $request->time_limit,
            'play_mode' => $request->input('play_mode', 'all'),
            'is_public' => $request->boolean('is_public'),
        ]);

        return response()->json(new QuizResource($quiz->load(['category', 'media', 'author.avatar', 'quizStatus'])), 201);
    }

    public function show(Quiz $quiz, Request $request)
    {
        Gate::authorize('view', $quiz);

        $quiz->load(['category', 'media', 'author.avatar', 'quizStatus']);
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
            ->paginate($this->perPage($request)));
    }

    /**
     * Serialise a quiz into the same JSON format that /quizzes/import-json
     * accepts, so a teacher can back up or move a quiz between installations.
     */
    public function export(Quiz $quiz)
    {
        // Only the author may export: the payload contains the correct answers.
        Gate::authorize('update', $quiz);

        $quiz->load([
            'questions' => fn ($query) => $query->orderBy('display_order'),
            'questions.answers' => fn ($query) => $query->orderBy('display_order'),
        ]);

        $choiceTypes = ['single_choice', 'multiple_choice', 'true_false'];

        $questions = $quiz->questions->map(function (Question $question) use ($choiceTypes) {
            $data = [
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'display_order' => $question->display_order,
            ];

            if (in_array($question->question_type, $choiceTypes, true)) {
                $data['answers'] = $question->answers->map(fn (Answer $answer) => [
                    'answer_text' => $answer->answer_text,
                    'is_correct' => (bool) $answer->is_correct,
                    'display_order' => $answer->display_order,
                ])->values()->all();
            }

            if ($question->question_type === 'text_input') {
                $data['correct_text'] = $question->correct_text;
                $data['match_mode'] = $question->match_mode;
            }

            if ($question->question_type === 'theory') {
                $data['config'] = ['content' => $question->config['content'] ?? ''];
            }

            return $data;
        })->values()->all();

        return response()->json([
            'format' => 'moonlight-quiz',
            'version' => 1,
            'title' => $quiz->title,
            'description' => $quiz->description,
            'category_id' => $quiz->category_id,
            'difficulty' => $quiz->difficulty,
            'time_limit' => $quiz->time_limit,
            'play_mode' => $quiz->play_mode ?? 'all',
            'language' => $quiz->language,
            'is_public' => (bool) $quiz->is_public,
            'questions' => $questions,
        ]);
    }

    public function update(UpdateQuizRequest $request, Quiz $quiz)
    {
        Gate::authorize('update', $quiz);

        $data = $request->validated();

        if (array_key_exists('status', $data)) {
            $data['quiz_status_id'] = $this->statusId($data['status']);
            unset($data['status']);
        }

        $quiz->update($data);

        return response()->json(new QuizResource($quiz->load(['category', 'media', 'author.avatar', 'quizStatus'])));
    }

    public function destroy(Quiz $quiz)
    {
        Gate::authorize('delete', $quiz);

        $quiz->delete();

        return response()->noContent();
    }

    /**
     * Resolve a status name (draft/published/archived) to its primary key.
     */
    private function statusId(string $status): int
    {
        return QuizStatus::firstOrCreate(['status' => $status])->quiz_status_id;
    }

    private function perPage(Request $request): int
    {
        return min(max((int) $request->input('per_page', 12), 1), 50);
    }
}
