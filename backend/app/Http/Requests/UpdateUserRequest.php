<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        Gate::authorize('update', $this->route('user'));
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:50', 'regex:/^[a-zA-Z0-9_]+$/', Rule::unique('users', 'username')->ignore($this->route('user')->id)],
            'country' => ['nullable', 'string', 'max:100'],
            'preferred_language' => ['nullable', 'string', 'max:10'],
            'current_password' => ['required_with:password', 'current_password'],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
            'is_private' => ['sometimes', 'boolean'],
            'avatar_id' => ['nullable', 'string', 'exists:media,file_id'],
        ];
    }
}
