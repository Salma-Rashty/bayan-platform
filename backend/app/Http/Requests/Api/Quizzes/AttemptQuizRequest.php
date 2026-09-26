<?php

namespace App\Http\Requests\Api\Quizzes;

use Illuminate\Foundation\Http\FormRequest;

class AttemptQuizRequest extends FormRequest
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
            'answers' => ['required', 'array'],
            'answers.*' => ['array'],
            'answers.*.*' => ['integer'],
        ];
    }
}
