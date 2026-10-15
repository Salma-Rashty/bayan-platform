<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A category the applicant chose to teach.
 */
#[Fillable(['teacher_application_id', 'category_id'])]
class TeacherApplicationCategory extends Model
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
}
