<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Categories\IndexCategoriesRequest;
use App\Http\Requests\Api\Categories\StoreCategoryRequest;
use App\Http\Requests\Api\Categories\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Support\CatalogUniqueness;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    /**
     * All categories, unpaginated: the catalog is small and also feeds the level forms' category picker.
     */
    public function index(IndexCategoriesRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $categories = Category::query()
            ->withCount(self::levelCounts())
            ->when(isset($filters['active']), fn ($query) => $query->where('is_active', $request->boolean('active')))
            ->when(($filters['trashed'] ?? null) === 'with', fn ($query) => $query->withTrashed())
            ->when(($filters['trashed'] ?? null) === 'only', fn ($query) => $query->onlyTrashed())
            ->orderBy('order')
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function show(Category $category): CategoryResource
    {
        Gate::authorize('view', $category);

        return new CategoryResource($category->loadCount(self::levelCounts()));
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return (new CategoryResource($category->refresh()->loadCount(self::levelCounts())))->response()->setStatusCode(201);
    }

    public function update(UpdateCategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());

        return new CategoryResource($category->loadCount(self::levelCounts()));
    }

    public function destroy(Category $category): JsonResponse
    {
        Gate::authorize('delete', $category);

        // Soft-deleted levels don't block: they can only be restored once the category is.
        $levels = $category->levels()->count();

        if ($levels > 0) {
            throw ValidationException::withMessages([
                'category' => [
                    "\"{$category->name}\" has {$levels} ".Str::plural('level', $levels)
                    .'. Delete or move them to another category before deleting it.',
                ],
            ]);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    public function restore(Category $category): CategoryResource
    {
        Gate::authorize('restore', $category);

        // Its name or order may have been reused while it was deleted.
        $conflicts = CatalogUniqueness::categoryConflicts($category->only(['name', 'order']), $category->id);

        if ($conflicts !== []) {
            throw ValidationException::withMessages([
                'category' => ["Can't restore \"{$category->name}\": ".implode(' ', $conflicts).' Change that category first.'],
            ]);
        }

        $category->restore();

        return new CategoryResource($category->loadCount(self::levelCounts()));
    }

    /**
     * Switches on every live level's own is_active. The category's state is untouched, so in
     * an inactive category the levels stay effectively inactive until it's switched on.
     */
    public function activateAllLevels(Category $category): JsonResponse
    {
        Gate::authorize('update', $category);

        $activated = $category->levels()->where('is_active', false)->update(['is_active' => true]);

        return response()->json([
            'message' => $activated === 0
                ? 'All levels were already active.'
                : "Activated {$activated} ".Str::plural('level', $activated).'.',
            'activated' => $activated,
            'category' => new CategoryResource($category->loadCount(self::levelCounts())),
        ]);
    }

    /**
     * Non-deleted level counts for CategoryResource: all of them, and those switched off themselves.
     *
     * @return array<int|string, mixed>
     */
    private static function levelCounts(): array
    {
        return [
            'levels',
            'levels as inactive_levels_count' => fn ($query) => $query->where('is_active', false),
        ];
    }
}
