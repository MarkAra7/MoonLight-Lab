<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'string', 'exists:categories,category_id'],
            'media_id' => ['nullable', 'string', 'exists:media,file_id'],
            'is_public' => ['boolean'],
        ];
    }
}
