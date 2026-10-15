<?php

namespace App\Models;

use App\Support\ApplicantHistory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'submitted_by_id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'phone_country',
    'nationality',
    'birth_date',
    'gender',
    'about',
    'cv_path',
    'video_path',
    'status',
    'notes',
])]
class TeacherApplication extends Model
{
    use SoftDeletes;

    public const GENDERS = ['male', 'female'];

    public const AGE_GROUPS = ['children', 'teenagers', 'adults', 'elderly'];

    public const STATUSES = ['pending', 'reviewing', 'interview', 'accepted', 'rejected'];

    /**
     * The review pipeline: pending -> reviewing -> interview -> accepted, with rejection
     * possible at any open stage. Accepted and rejected are final.
     *
     * @var array<string, list<string>>
     */
    public const TRANSITIONS = [
        'pending' => ['reviewing', 'rejected'],
        'reviewing' => ['interview', 'rejected'],
        'interview' => ['accepted', 'rejected'],
        'accepted' => [],
        'rejected' => [],
    ];

    /**
     * Mirrors the column default so new instances have a status before being refreshed.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    /**
     * The identity key always follows the name and birth date (see ApplicantHistory).
     */
    protected static function booted(): void
    {
        static::saving(function (TeacherApplication $application) {
            if ($application->first_name && $application->last_name && $application->birth_date) {
                $application->identity_key = ApplicantHistory::identityKey(
                    $application->first_name,
                    $application->last_name,
                    $application->birth_date,
                );
            }
        });
    }

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'cooldown_lifted_at' => 'datetime',
        ];
    }

    /** The applicant's account. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Who submitted it: the applicant, or an admin on their behalf. */
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_id');
    }

    public function cooldownLiftedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cooldown_lifted_by_id');
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(TeacherApplicationCategory::class);
    }

    public function levels(): HasMany
    {
        return $this->hasMany(TeacherApplicationLevel::class);
    }

    public function ageGroups(): HasMany
    {
        return $this->hasMany(TeacherApplicationAgeGroup::class);
    }
}
