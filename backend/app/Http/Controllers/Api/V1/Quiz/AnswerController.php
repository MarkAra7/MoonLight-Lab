<?php

namespace App\Http\Controllers\Api\V1\Quiz;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AnswerController extends Controller
{
    public function index(Question $question)
    {
        Gate::authorize('view', $question->quiz);

        return $question->answers()->orderBy('display_order')->get();
    }

    public function store(Request $request, Question $question)
    {
        Gate::authorize('update', $question->quiz);

        $validated = $request->validate([
            'answer_text' => 'required|string',
            'is_correct' => 'required|boolean',
            'media_id' => 'nullable|string|exists:media,file_id',
            'display_order' => 'nullable|integer|min:0',
            'config' => 'nullable|json',
        ]);

        $maxOrder = $question->answers()->max('display_order') ?? 0;
        $validated['display_order'] = $validated['display_order'] ?? $maxOrder + 1;
        $validated['question_id'] = $question->question_id;

        $answer = Answer::create($validated);

        return response()->json($answer, 201);
    }

    public function show(Answer $answer)
    {
        Gate::authorize('view', $answer->question->quiz);

        return $answer;
    }

    public function update(Request $request, Answer $answer)
    {
        Gate::authorize('update', $answer->question->quiz);

        $validated = $request->validate([
            'answer_text' => 'sometimes|string',
            'is_correct' => 'sometimes|boolean',
            'media_id' => 'nullable|string|exists:media,file_id',
            'display_order' => 'nullable|integer|min:0',
            'config' => 'nullable|json',
        ]);

        $answer->update($validated);

        return $answer;
    }

    public function destroy(Answer $answer)
    {
        Gate::authorize('update', $answer->question->quiz);

        $answer->delete();

        return response()->noContent();
    }
}
