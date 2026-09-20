<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'assignment_id',
    'user_id',
    'content',
    'file_path',
    'grade',
    'feedback',
    'submitted_at',
    'graded_at',
])]
class Submission extends Model
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
            'grade' => 'decimal:2',
            'submitted_at' => 'datetime',
            'graded_at' => 'datetime',
        ];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Find an existing row (including trashed) for the given attributes, restoring
     * and updating it if it was soft-deleted, or create a new one if none exists.
     * Avoids inserting a duplicate that would violate the assignment_id/user_id unique index.
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
