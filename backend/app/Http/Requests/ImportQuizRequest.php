<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $choiceTypes = ['single_choice', 'multiple_choice', 'true_false'];

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'string', 'exists:categories,category_id'],
            'is_public' => ['nullable', 'boolean'],
            'difficulty' => ['nullable', 'string', 'in:easy,medium,hard'],
            'time_limit' => ['nullable', 'integer', 'min:0'],
            'language' => ['nullable', 'string', 'max:50'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.question_text' => ['required', 'string'],
            'questions.*.question_type' => ['required', 'string', 'exists:question_types,question_type_id'],
            'questions.*.display_order' => ['nullable', 'integer', 'min:0'],
            'questions.*.answers' => ['nullable', 'array'],
            'questions.*.answers.*.answer_text' => ['required', 'string'],
            'questions.*.answers.*.is_correct' => ['required', 'boolean'],
            'questions.*.answers.*.display_order' => ['nullable', 'integer', 'min:0'],
            'questions.*.correct_text' => ['nullable', 'string', 'max:255'],
            'questions.*.config.correct_text' => ['nullable', 'string', 'max:255'],
            'questions.*.match_mode' => ['nullable', 'string', Rule::in(['exact', 'case_insensitive', 'partial'])],
            'questions.*.config.content' => ['nullable', 'string'],
        ];
    }

    public function prepareForValidation()
    {
        if ($this->has('quiz')) {
            $this->merge($this->input('quiz'));
        }
    }

    public function messages(): array
    {
        return [
            'questions.required' => 'At least one question is required.',
            'questions.*.answers.min' => 'Choice questions must have at least 2 answers.',
            'questions.*.answers.*.is_correct.required' => 'Each answer must specify if it is correct.',
            'questions.*.correct_text.required_if' => 'Text input questions need a "correct_text" field.',
            'questions.*.correct_text.prohibited_unless' => 'Only text input questions may have a "correct_text" field.',
            'questions.*.config.content.required_if' => 'Theory questions need a "config" object with "content".',
        ];
    }
}
