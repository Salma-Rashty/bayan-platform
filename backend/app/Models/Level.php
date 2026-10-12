<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * A level is effectively active only while it AND its (non-deleted) category are active.
     * Its own is_active is never overwritten by the category: switching the category off
     * hides its levels, and switching it back on restores each level's own saved state.
     * Use this, not is_active alone, wherever levels are offered or listed as "active".
     */
    public function isEffectivelyActive(): bool
    {
        $category = $this->category;

        return $this->is_active && $category !== null && ! $category->trashed() && $category->is_active;
    }

    /**
     * Levels that are effectively active (see isEffectivelyActive()).
     */
    #[Scope]
    protected function effectivelyActive(Builder $query): void
    {
        // whereHas skips soft-deleted categories through their SoftDeletes scope.
        $query->where('levels.is_active', true)
            ->whereHas('category', fn (Builder $query) => $query->where('is_active', true));
    }

    /**
     * Levels that are not effectively active: off themselves, or in an inactive or deleted category.
     */
    #[Scope]
    protected function effectivelyInactive(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query
            ->where('levels.is_active', false)
            ->orWhereDoesntHave('category', fn (Builder $query) => $query->where('is_active', true)));
    }
}
