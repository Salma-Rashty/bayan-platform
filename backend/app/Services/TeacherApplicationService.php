<?php

namespace App\Services;

use App\Models\TeacherApplication;
use App\Models\User;
use App\Support\ApplicantHistory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mime\MimeTypes;
use Throwable;

class TeacherApplicationService
{
    /**
     * Private local disk for now; files are served to admins through signed temporary URLs.
     * TODO: move to S3 (same disk API; temporaryUrl() works there too) before production,
     * since 500 MB videos shouldn't live on the app server.
     */
    public const DISK = 'local';

    /**
     * MIME type from the stored extension, which was itself derived from the upload's content
     * (UploadedFile::extension()), so the disk doesn't need reading to know it. A video/* type
     * wins where there's a choice (".mp4" lists "application/mp4" first), so players accept it.
     */
    public static function mimeType(string $path): string
    {
        $types = MimeTypes::getDefault()->getMimeTypes(pathinfo($path, PATHINFO_EXTENSION));

        return collect($types)->first(fn (string $type) => str_starts_with($type, 'video/'))
            ?? $types[0]
            ?? 'application/octet-stream';
    }

    /**
     * A readable download name, e.g. "amina-hassan-cv.pdf".
     */
    public static function downloadName(TeacherApplication $application, string $file, string $path): string
    {
        return Str::slug($application->fullName()).'-'.$file.'.'.pathinfo($path, PATHINFO_EXTENSION);
    }

    /**
     * Store a public application with its files and its category/level/age-group selections.
     *
     * @param  array<string, mixed>  $applicant
     * @param  list<array{category_id: int, levels: list<array{level_id: int, age_groups: list<string>}>, age_groups: list<string>}>  $selections
     */
    public function submit(
        array $applicant,
        array $selections,
        UploadedFile $cv,
        ?UploadedFile $video,
        ?User $applicantUser,
        User $submittedBy,
    ): TeacherApplication {
        // Files go first, under a random folder, so the row is never saved pointing at a missing file.
        $folder = 'teacher-applications/'.Str::uuid();
        $disk = Storage::disk(self::DISK);

        try {
            $cvPath = $disk->putFileAs($folder, $cv, 'cv.'.$cv->extension());
            $videoPath = $video ? $disk->putFileAs($folder, $video, 'video.'.$video->extension()) : null;

            if ($cvPath === false || $videoPath === false) {
                throw new \RuntimeException('Could not store the uploaded files.');
            }

            return DB::transaction(function () use ($applicant, $selections, $cvPath, $videoPath, $applicantUser, $submittedBy) {
                $application = TeacherApplication::create([
                    ...$applicant,
                    'user_id' => $applicantUser?->id,
                    'submitted_by_id' => $submittedBy->id,
                    'cv_path' => $cvPath,
                    'video_path' => $videoPath,
                    'status' => 'pending',
                ]);

                foreach ($selections as $selection) {
                    $categoryId = $selection['category_id'];
                    $application->categories()->create(['category_id' => $categoryId]);

                    foreach ($selection['levels'] as $level) {
                        $application->levels()->create(['category_id' => $categoryId, 'level_id' => $level['level_id']]);

                        foreach ($level['age_groups'] as $ageGroup) {
                            $application->ageGroups()->create([
                                'category_id' => $categoryId,
                                'level_id' => $level['level_id'],
                                'age_group' => $ageGroup,
                            ]);
                        }
                    }

                    foreach ($selection['age_groups'] as $ageGroup) {
                        $application->ageGroups()->create(['category_id' => $categoryId, 'age_group' => $ageGroup]);
                    }
                }

                return $application;
            });
        } catch (Throwable $e) {
            $disk->deleteDirectory($folder);

            throw $e;
        }
    }

    /**
     * Move the application along the review pipeline (see TeacherApplication::TRANSITIONS).
     * Accepting also creates-or-restores the applicant's User and grants the teacher role.
     */
    public function transition(TeacherApplication $application, string $status): TeacherApplication
    {
        if (! $application->canTransitionTo($status)) {
            $allowed = TeacherApplication::TRANSITIONS[$application->status] ?? [];

            throw ValidationException::withMessages([
                'status' => [$allowed === []
                    ? "This application is already {$application->status}."
                    : "A {$application->status} application can only move to: ".implode(', ', $allowed).'.'],
            ]);
        }

        DB::transaction(function () use ($application, $status) {
            if ($status === 'accepted') {
                $this->grantTeacherRole($application);
            }

            $application->update(['status' => $status]);
        });

        return $application;
    }

    public function accept(TeacherApplication $application): TeacherApplication
    {
        return $this->transition($application, 'accepted');
    }

    public function reject(TeacherApplication $application): TeacherApplication
    {
        return $this->transition($application, 'rejected');
    }

    /**
     * Add the teacher role to the applicant's account, keeping their other roles (roles stack).
     * Normally that's the linked account; for an application without one (an older anonymous
     * one, or submitted by an admin), create-or-restore the User by email and link it.
     */
    private function grantTeacherRole(TeacherApplication $application): void
    {
        $user = $application->user_id ? User::withTrashed()->find($application->user_id) : null;
        $user ??= User::withTrashed()->firstWhere('email', $application->email);

        if ($user) {
            if ($user->trashed()) {
                $user->restore();
            }
        } else {
            $user = User::create([
                'name' => $application->fullName(),
                'email' => $application->email,
                'phone' => $application->phone,
                'password' => Str::password(),
            ]);
        }

        if (! $user->hasRole('teacher')) {
            $user->assignRole('teacher');
        }

        $application->user_id ??= $user->id;
    }

    /**
     * Let the applicant reapply before the cooldown is up, by marking their latest application
     * (the one the cooldown counts from). Their next application starts a new cooldown.
     */
    public function liftCooldown(TeacherApplication $application, User $admin): TeacherApplication
    {
        $latest = ApplicantHistory::latest($application->user_id, [$application->identity_key]);

        if (! ApplicantHistory::nextAllowedAt($latest)) {
            throw ValidationException::withMessages([
                'cooldown' => ['This applicant can already apply again.'],
            ]);
        }

        $latest->forceFill(['cooldown_lifted_at' => now(), 'cooldown_lifted_by_id' => $admin->id])->save();

        return $application;
    }
}
