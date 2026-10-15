<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An age group the applicant can teach: per chosen level when the category has levels
 * (level_id set), or per category when it has none (level_id null).
 */
#[Fillable(['teacher_application_id', 'category_id', 'level_id', 'age_group'])]
class TeacherApplicationAgeGroup extends Model
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
