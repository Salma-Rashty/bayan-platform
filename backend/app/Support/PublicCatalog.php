<?php

namespace App\Support;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;

/**
 * The catalog as offered to the public. Soft-deleted categories and levels never appear.
 */
class PublicCatalog
{
    /**
     * Student-facing: only active categories, each with only its effectively-active levels.
     * A category whose levels are all off is offered as a category without levels.
     *
     * @return Collection<int, Category> keyed by category id, `levels` loaded and filtered.
     */
    public static function active(): Collection
    {
        // Within an active category, a level's own is_active is all that's left of
        // "effectively active" (see Level::isEffectivelyActive()).
        return self::query(includeInactive: false);
    }

    /**
     * For the "Teach with us" form: every category and level, active or not. Inactive often
     * means there's no teacher for it yet, which is exactly when we want applicants.
     *
     * @return Collection<int, Category> keyed by category id, `levels` loaded.
     */
    public static function forTeacherApplications(): Collection
    {
        return self::query(includeInactive: true);
    }

    private static function query(bool $includeInactive): Collection
    {
        return Category::query()
            ->unless($includeInactive, fn ($query) => $query->where('is_active', true))
            ->with(['levels' => fn ($query) => $query->unless($includeInactive, fn ($query) => $query->where('is_active', true))])
            ->orderBy('order')
            ->orderBy('name')
            ->get()
            ->keyBy('id');
    }
}
