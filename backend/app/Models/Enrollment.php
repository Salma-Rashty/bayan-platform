<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'course_id',
    'status',
    'enrolled_at',
])]
class Enrollment extends Model
{
    use SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Find an existing row (including trashed) for the given attributes, restoring
     * and updating it if it was soft-deleted, or create a new one if none exists.
     * Avoids inserting a duplicate that would violate the user_id/course_id unique index.
     */
    public static function createOrReactivate(array $attributes, array $values = []): self
    {
        $existing = static::withTrashed()->where($attributes)->first();

        if ($existing) {
            if ($existing->trashed()) {
                $existing->restore();
                $existing->update($values);
            }

            return $existing;
        }

        return static::create([...$attributes, ...$values]);
    }
}
