<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Level;
use Illuminate\Validation\Validator;

/**
 * The catalog's uniqueness rules, mirroring the `*_alive_unique` indexes: among live
 * (non-deleted) rows, category names and orders are unique, and level names and orders
 * are unique within their category. Soft-deleted rows never block. Returns readable
 * messages so validation and restore can explain a clash instead of hitting the index.
 */
final class CatalogUniqueness
{
    /**
     * @param  array{name?: mixed, order?: mixed}  $values  only the fields to check
     * @return array<string, string> field => message
     */
    public static function categoryConflicts(array $values, ?int $ignoreId = null): array
    {
        $messages = [];

        if (isset($values['name']) && is_string($values['name'])) {
            if (self::liveCategory('name', $values['name'], $ignoreId)) {
                $messages['name'] = "A category named \"{$values['name']}\" already exists.";
            }
        }

        if (isset($values['order']) && is_numeric($values['order'])) {
            if ($owner = self::liveCategory('order', (int) $values['order'], $ignoreId)) {
                $messages['order'] = "Order {$values['order']} is already used by \"{$owner->name}\".";
            }
        }

        return $messages;
    }

    /**
     * @param  array{name?: mixed, order?: mixed}  $values  only the fields to check
     * @return array<string, string> field => message
     */
    public static function levelConflicts(int $categoryId, array $values, ?int $ignoreId = null): array
    {
        $messages = [];

        if (isset($values['name']) && is_string($values['name'])) {
            if (self::liveLevel($categoryId, 'name', $values['name'], $ignoreId)) {
                $messages['name'] = "This category already has a level named \"{$values['name']}\".";
            }
        }

        if (isset($values['order']) && is_numeric($values['order'])) {
            if ($owner = self::liveLevel($categoryId, 'order', (int) $values['order'], $ignoreId)) {
                $messages['order'] = "Order {$values['order']} is already used by \"{$owner->name}\" in this category.";
            }
        }

        return $messages;
    }

    /**
     * Adds conflict messages to a validator, skipping fields that already failed another rule.
     *
     * @param  array<string, string>  $messages
     */
    public static function addErrors(Validator $validator, array $messages): void
    {
        foreach ($messages as $field => $message) {
            if (! $validator->errors()->has($field)) {
                $validator->errors()->add($field, $message);
            }
        }
    }

    private static function liveCategory(string $column, string|int $value, ?int $ignoreId): ?Category
    {
        return Category::query()
            ->where($column, $value)
            ->when($ignoreId, fn ($query, int $id) => $query->whereKeyNot($id))
            ->first();
    }

    private static function liveLevel(int $categoryId, string $column, string|int $value, ?int $ignoreId): ?Level
    {
        return Level::query()
            ->where('category_id', $categoryId)
            ->where($column, $value)
            ->when($ignoreId, fn ($query, int $id) => $query->whereKeyNot($id))
            ->first();
    }
}
