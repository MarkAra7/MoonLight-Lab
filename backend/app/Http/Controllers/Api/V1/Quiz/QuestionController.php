<?php

namespace App\Http\Controllers\Api\V1\Quiz;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Quiz;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class QuestionController extends Controller
{
    public function index(Quiz $quiz)
    {
        Gate::authorize('view', $quiz);

        return $quiz->questions()->with('answers')->orderBy('display_order')->get();
    }

    public function store(Request $request, Quiz $quiz)
    {
        Gate::authorize('update', $quiz);

        $validated = $request->validate([
            'question_text' => 'required|string',
            'question_type' => 'required|string|exists:question_types,question_type_id',
            'media_id' => 'nullable|string|exists:media,file_id',
            'display_order' => 'nullable|integer|min:0',
            'config' => 'nullable|json',
        ]);

        $maxOrder = $quiz->questions()->max('display_order') ?? 0;
        $validated['display_order'] = $validated['display_order'] ?? $maxOrder + 1;
        $validated['quiz_id'] = $quiz->quiz_id;

        $question = Question::create($validated);

        return response()->json($question->load('answers'), 201);
    }

    public function show(Question $question)
    {
        Gate::authorize('view', $question->quiz);

        return $question->load('answers');
    }

    public function update(Request $request, Question $question)
    {
        Gate::authorize('update', $question->quiz);

        $validated = $request->validate([
            'question_text' => 'sometimes|string',
            'question_type' => 'sometimes|string|exists:question_types,question_type_id',
            'media_id' => 'nullable|string|exists:media,file_id',
            'display_order' => 'nullable|integer|min:0',
            'config' => 'nullable|json',
        ]);

        $question->update($validated);

        return response()->json($question->load('answers'));
    }

    public function destroy(Question $question)
    {
        Gate::authorize('update', $question->quiz);

        $question->answers()->delete();
        $question->delete();

        return response()->noContent();
    }

    public function reorder(Request $request, Quiz $quiz)
    {
        Gate::authorize('update', $quiz);

        $validated = $request->validate([
            'questions' => 'required|array',
            'questions.*.question_id' => 'required|string|exists:questions,question_id',
            'questions.*.display_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['questions'] as $item) {
            Question::where('question_id', $item['question_id'])
                ->where('quiz_id', $quiz->quiz_id)
                ->update(['display_order' => $item['display_order']]);
        }

        return response()->json(['message' => 'Questions reordered.']);
    }
}
