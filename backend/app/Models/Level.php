<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['category_id', 'name', 'description', 'is_active', 'order'])]
class Level extends Model
{
    use SoftDeletes;

    /**
     * Order is unique among a category's live levels, so a new one without an explicit order goes last.
     */
    protected static function booted(): void
    {
        static::creating(function (Level $level) {
            $level->order ??= (int) static::where('category_id', $level->category_id)->max('order') + 1;
        });
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
