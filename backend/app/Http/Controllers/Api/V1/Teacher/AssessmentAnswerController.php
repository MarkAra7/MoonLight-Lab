<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AssessmentAnswer;
use App\Models\AssessmentQuestion;
use Illuminate\Http\Request;

class AssessmentAnswerController extends Controller
{
    public function index(Request $request, AssessmentQuestion $question)
    {
        $this->authorizeOwner($request, $question);

        return response()->json($question->answers()->orderBy('display_order')->get());
    }

    public function store(Request $request, AssessmentQuestion $question)
    {
        $this->authorizeOwner($request, $question);

        $data = $request->validate([
            'answer_text' => 'required|string',
            'is_correct' => 'required|boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $data['display_order'] = $data['display_order']
            ?? ($question->answers()->max('display_order') ?? 0) + 1;
        $data['question_id'] = $question->question_id;

        $answer = AssessmentAnswer::create($data);

        return response()->json($answer, 201);
    }

    public function show(Request $request, AssessmentAnswer $answer)
    {
        $this->authorizeOwner($request, $answer->question);

        return response()->json($answer);
    }

    public function update(Request $request, AssessmentAnswer $answer)
    {
        $this->authorizeOwner($request, $answer->question);

        $data = $request->validate([
            'answer_text' => 'sometimes|string',
            'is_correct' => 'sometimes|boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $answer->update($data);

        return response()->json($answer);
    }

    public function destroy(Request $request, AssessmentAnswer $answer)
    {
        $this->authorizeOwner($request, $answer->question);

        $answer->delete();

        return response()->noContent();
    }

    private function authorizeOwner(Request $request, AssessmentQuestion $question): void
    {
        if ($question->assessment->teacher_id !== $request->user()->id) abort(403);
    }
}
