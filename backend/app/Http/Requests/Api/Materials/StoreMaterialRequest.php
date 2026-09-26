<?php

namespace App\Http\Requests\Api\Materials;

use App\Models\Material;
use Illuminate\Foundation\Http\FormRequest;

class StoreMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Material::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'file_path' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
        ];
    }
}
