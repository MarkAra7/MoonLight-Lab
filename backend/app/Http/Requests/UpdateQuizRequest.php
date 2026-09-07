<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'string', 'exists:categories,category_id'],
            'media_id' => ['nullable', 'string', 'exists:media,file_id'],
            'language' => ['nullable', 'string', 'max:50'],
            'difficulty' => ['nullable', 'string', 'in:easy,medium,hard'],
            'time_limit' => ['nullable', 'integer', 'min:0'],
            'config' => ['nullable', 'json'],
            'is_public' => ['boolean'],
        ];
    }
}
