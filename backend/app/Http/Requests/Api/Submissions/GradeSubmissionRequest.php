<?php

namespace App\Http\Requests\Api\Submissions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class GradeSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('grade-homework');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'grade' => ['required', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string'],
        ];
    }
}
