<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Levels\IndexLevelsRequest;
use App\Http\Requests\Api\Levels\StoreLevelRequest;
use App\Http\Requests\Api\Levels\UpdateLevelRequest;
use App\Http\Resources\LevelResource;
use App\Models\Category;
use App\Models\Level;
use App\Support\CatalogUniqueness;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class LevelController extends Controller
{
    /**
     * All levels, unpaginated (the catalog is small), grouped by category in the categories' display order.
     */
    public function index(IndexLevelsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $category = fn (string $column) => Category::withTrashed()->select($column)->whereColumn('categories.id', 'levels.category_id');

        $query = Level::query()
            ->when($filters['category_id'] ?? null, fn ($query, int $categoryId) => $query->where('category_id', $categoryId))
            ->orderBy($category('order'))
            ->orderBy($category('name'))
            ->orderBy('order')
            ->orderBy('name');

        return LevelResource::collection($this->filtered($query, $request)->get());
    }

    /**
     * The levels of one category, in display order (deleted categories included, for their detail page).
     */
    public function forCategory(IndexLevelsRequest $request, Category $category): AnonymousResourceCollection
    {
        Gate::authorize('view', $category);

        return LevelResource::collection($this->filtered($category->levels()->getQuery(), $request)->get());
    }

    public function show(Level $level): LevelResource
    {
        Gate::authorize('view', $level);

        return new LevelResource($this->loadCategory($level));
    }

    public function store(StoreLevelRequest $request): JsonResponse
    {
        $level = Level::create($request->validated());

        return (new LevelResource($this->loadCategory($level->refresh())))->response()->setStatusCode(201);
    }

    public function update(UpdateLevelRequest $request, Level $level): LevelResource
    {
        $level->update($request->validated());

        return new LevelResource($this->loadCategory($level));
    }

    public function destroy(Level $level): JsonResponse
    {
        Gate::authorize('delete', $level);

        $level->delete();

        return response()->json(['message' => 'Level deleted.']);
    }

    public function restore(Level $level): LevelResource
    {
        Gate::authorize('restore', $level);

        $category = $level->category()->withTrashed()->first();

        if ($category?->trashed()) {
            throw ValidationException::withMessages([
                'level' => ["Its category \"{$category->name}\" is deleted. Restore the category first."],
            ]);
        }

        // Its name or order may have been reused in the category while it was deleted.
        $conflicts = CatalogUniqueness::levelConflicts($level->category_id, $level->only(['name', 'order']), $level->id);

        if ($conflicts !== []) {
            throw ValidationException::withMessages([
                'level' => ["Can't restore \"{$level->name}\": ".implode(' ', $conflicts).' Change that level first.'],
            ]);
        }

        $level->restore();

        return new LevelResource($this->loadCategory($level));
    }

    /**
     * Applies the shared active/trashed filters; ordering is left to the caller.
     */
    private function filtered(Builder $query, IndexLevelsRequest $request): Builder
    {
        $filters = $request->validated();

        return $query
            ->with(['category' => fn ($query) => $query->withTrashed()])
            ->when(isset($filters['active']), fn ($query) => $query->where('is_active', $request->boolean('active')))
            ->when(($filters['trashed'] ?? null) === 'with', fn ($query) => $query->withTrashed())
            ->when(($filters['trashed'] ?? null) === 'only', fn ($query) => $query->onlyTrashed());
    }

    private function loadCategory(Level $level): Level
    {
        return $level->load(['category' => fn ($query) => $query->withTrashed()]);
    }
}
