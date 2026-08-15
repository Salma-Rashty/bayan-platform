<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['lesson_id', 'title', 'file_path', 'type'])]
class Material extends Model
{
    use SoftDeletes;

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
