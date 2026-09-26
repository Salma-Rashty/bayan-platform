<?php

namespace App\Http\Requests\Api\Courses;

use Illuminate\Foundation\Http\FormRequest;

class ApplyCourseRequest extends FormRequest
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
            'notes' => ['nullable', 'string'],
        ];
    }
}
