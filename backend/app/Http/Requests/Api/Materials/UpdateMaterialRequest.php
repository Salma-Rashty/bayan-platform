<?php

namespace App\Http\Requests\Api\Materials;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('material'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'file_path' => ['sometimes', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
        ];
    }
}
