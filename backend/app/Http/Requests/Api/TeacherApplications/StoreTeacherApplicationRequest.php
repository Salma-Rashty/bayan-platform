<?php

namespace App\Http\Requests\Api\TeacherApplications;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'qualifications' => ['nullable', 'string'],
            'cv_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
