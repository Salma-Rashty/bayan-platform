<?php

namespace App\Http\Requests\Api\TeacherApplications;

use App\Models\TeacherApplication;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class IndexTeacherApplicationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('viewAny', TeacherApplication::class);

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::in(TeacherApplication::STATUSES)],
        ];
    }
}
