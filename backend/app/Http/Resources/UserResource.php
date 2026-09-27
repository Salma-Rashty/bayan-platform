<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'country' => $this->country,
            'status' => $this->status,
            'roles' => $this->getRoleNames(),
            // Effective permissions: direct grants plus those inherited from roles.
            'permissions' => $this->getAllPermissions()->pluck('name'),
            'direct_permissions' => $this->getDirectPermissions()->pluck('name'),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'enrollments' => EnrollmentResource::collection($this->whenLoaded('enrollments')),
            'notes' => UserNoteResource::collection($this->whenLoaded('notes')),
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
