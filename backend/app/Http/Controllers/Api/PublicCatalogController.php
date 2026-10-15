<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Level;
use App\Support\PublicCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class PublicCatalogController extends Controller
{
    /**
     * Student-facing: effectively-active categories with their effectively-active levels,
     * in display order. Only what the public needs, no admin fields.
     */
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->present(PublicCatalog::active(), withStatus: false)]);
    }

    /**
     * For the "Teach with us" form only: all categories and levels, inactive included, each
     * flagged so the form can mark the ones we're currently seeking teachers for.
     */
    public function teacherApplication(): JsonResponse
    {
        return response()->json(['data' => $this->present(PublicCatalog::forTeacherApplications(), withStatus: true)]);
    }

    private function present(Collection $categories, bool $withStatus): Collection
    {
        return $categories->values()->map(fn (Category $category) => [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            ...($withStatus ? ['is_active' => $category->is_active] : []),
            'has_levels' => $category->levels->isNotEmpty(),
            'levels' => $category->levels->map(fn (Level $level) => [
                'id' => $level->id,
                'name' => $level->name,
                'description' => $level->description,
                // The level's own setting; inside an inactive category every level is unavailable anyway.
                ...($withStatus ? ['is_active' => $level->is_active] : []),
            ])->values(),
        ]);
    }
}
