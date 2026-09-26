<?php

namespace App\Http\Requests\Api\Assignments;

use App\Models\Assignment;
use Illuminate\Foundation\Http\FormRequest;

class StoreAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Assignment::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
            'max_grade' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
