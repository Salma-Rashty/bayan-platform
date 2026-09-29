<?php

namespace App\Http\Resources;

use App\Support\AccessCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            // System roles can't be renamed or deleted; the locked one can't be edited at all.
            'is_system' => AccessCatalog::isSystemRole($this->name),
            'is_locked' => $this->name === AccessCatalog::LOCKED_ROLE,
            'permissions' => $this->whenLoaded('permissions', fn () => $this->permissions
                ->pluck('name')
                ->sortBy(fn (string $name) => AccessCatalog::permissionSortKey($name))
                ->values()),
            'permissions_count' => $this->whenCounted('permissions'),
            'users_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
