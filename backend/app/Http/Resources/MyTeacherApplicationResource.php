<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * An application as its applicant sees it: what they submitted and its status. No admin notes,
 * review controls, account links or history.
 */
class MyTeacherApplicationResource extends TeacherApplicationResource
{
    private const VISIBLE = [
        'id', 'first_name', 'last_name', 'name', 'email', 'phone', 'phone_country', 'phone_display',
        'nationality', 'nationality_name', 'birth_date', 'gender', 'about', 'status',
        'selections', 'files', 'created_at', 'updated_at',
    ];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return Arr::only(parent::toArray($request), self::VISIBLE);
    }
}
