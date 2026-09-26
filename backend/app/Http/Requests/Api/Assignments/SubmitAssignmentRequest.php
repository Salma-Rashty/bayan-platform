<?php

namespace App\Http\Requests\Api\Assignments;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAssignmentRequest extends FormRequest
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
            'content' => ['required_without:file_path', 'nullable', 'string'],
            'file_path' => ['required_without:content', 'nullable', 'string', 'max:255'],
        ];
    }
}
