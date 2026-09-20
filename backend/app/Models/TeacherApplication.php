<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'email',
    'phone',
    'qualifications',
    'cv_path',
    'status',
    'notes',
])]
class TeacherApplication extends Model
{
    use SoftDeletes;
}
