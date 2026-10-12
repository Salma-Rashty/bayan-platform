<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'description', 'is_active', 'order'])]
class Category extends Model
{
    use SoftDeletes;

    /**
     * Order is unique among live categories, so a new one without an explicit order goes last.
     */
    protected static function booted(): void
    {
        static::creating(function (Category $category) {
            $category->order ??= (int) static::max('order') + 1;
        });
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function levels(): HasMany
    {
        return $this->hasMany(Level::class)->orderBy('order')->orderBy('name');
    }
}
