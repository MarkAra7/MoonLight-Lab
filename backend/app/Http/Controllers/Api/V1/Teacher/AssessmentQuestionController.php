<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentQuestion;
use Illuminate\Http\Request;

class AssessmentQuestionController extends Controller
{
    public function index(Request $request, Assessment $assessment)
    {
        if ($assessment->teacher_id !== $request->user()->id) abort(403);

        return response()->json(
            $assessment->questions()->with('answers')->orderBy('display_order')->get()
        );
    }

    public function store(Request $request, Assessment $assessment)
    {
        if ($assessment->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'question_text' => 'required|string',
            'question_type' => 'required|string|exists:question_types,question_type_id',
            'points' => 'nullable|integer|min:0|max:1000',
            'display_order' => 'nullable|integer|min:0',
            'config' => 'nullable|array',
            'config.language' => 'nullable|string',
            'config.starter_code' => 'nullable|string|max:10000',
            'config.correct_text' => 'nullable|string|max:2000',
            'config.match_mode' => 'nullable|string|in:exact,case_insensitive,partial',
            'config.tests' => 'nullable|array|max:20',
            'config.tests.*.input' => 'nullable|string|max:4000',
            'config.tests.*.expected_output' => 'required|string|max:4000',
            'config.tests.*.hidden' => 'nullable|boolean',
        ]);

        if ($data['question_type'] === 'code') {
            if (empty($data['config']['language'])) {
                return response()->json(['message' => 'A code question needs a language.'], 422);
            }
            if (empty($data['config']['tests'])) {
                return response()->json(['message' => 'A code question needs at least one test.'], 422);
            }
        }

        $data['display_order'] = $data['display_order']
            ?? ($assessment->questions()->max('display_order') ?? 0) + 1;
        $data['points'] = $data['points'] ?? 1;
        $data['assessment_id'] = $assessment->assessment_id;

        $question = AssessmentQuestion::create($data);

        return response()->json($question->load('answers'), 201);
    }

    public function show(Request $request, AssessmentQuestion $question)
    {
        $this->authorizeOwner($request, $question);

        return response()->json($question->load('answers'));
    }

    public function update(Request $request, AssessmentQuestion $question)
    {
        $this->authorizeOwner($request, $question);

        $data = $request->validate([
            'question_text' => 'sometimes|string',
            'question_type' => 'sometimes|string|exists:question_types,question_type_id',
            'points' => 'nullable|integer|min:0|max:1000',
            'display_order' => 'nullable|integer|min:0',
            'config' => 'nullable|array',
            'config.language' => 'nullable|string',
            'config.starter_code' => 'nullable|string|max:10000',
            'config.correct_text' => 'nullable|string|max:2000',
            'config.match_mode' => 'nullable|string|in:exact,case_insensitive,partial',
            'config.tests' => 'nullable|array|max:20',
            'config.tests.*.input' => 'nullable|string|max:4000',
            'config.tests.*.expected_output' => 'required|string|max:4000',
            'config.tests.*.hidden' => 'nullable|boolean',
        ]);

        $question->update($data);

        return response()->json($question->load('answers'));
    }

    public function destroy(Request $request, AssessmentQuestion $question)
    {
        $this->authorizeOwner($request, $question);

        $question->answers()->delete();
        $question->delete();

        return response()->noContent();
    }

    public function reorder(Request $request, Assessment $assessment)
    {
        if ($assessment->teacher_id !== $request->user()->id) abort(403);

        $data = $request->validate([
            'questions' => 'required|array',
            'questions.*.question_id' => 'required|string|exists:assessment_questions,question_id',
            'questions.*.display_order' => 'required|integer|min:0',
        ]);

        foreach ($data['questions'] as $item) {
            AssessmentQuestion::where('question_id', $item['question_id'])
                ->where('assessment_id', $assessment->assessment_id)
                ->update(['display_order' => $item['display_order']]);
        }

        return response()->json(['message' => 'Questions reordered.']);
    }

    private function authorizeOwner(Request $request, AssessmentQuestion $question): void
    {
        if ($question->assessment->teacher_id !== $request->user()->id) abort(403);
    }
}
