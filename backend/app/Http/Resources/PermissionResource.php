<?php

namespace App\Http\Resources;

use App\Support\AccessCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            ...AccessCatalog::describePermission($this->name),
        ];
    }
}
