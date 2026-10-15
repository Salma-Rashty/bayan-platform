<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A level the applicant chose within a category that has levels.
 */
#[Fillable(['teacher_application_id', 'category_id', 'level_id'])]
class TeacherApplicationLevel extends Model
{
    use SoftDeletes;

    public function application(): BelongsTo
    {
        return $this->belongsTo(TeacherApplication::class, 'teacher_application_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }
}
