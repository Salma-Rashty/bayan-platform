<?php

namespace App\Http\Resources;

use App\Models\TeacherApplication;
use App\Models\TeacherApplicationAgeGroup;
use App\Models\TeacherApplicationCategory;
use App\Models\TeacherApplicationLevel;
use App\Models\User;
use App\Services\TeacherApplicationService;
use App\Support\ApplicantHistory;
use App\Support\Countries;
use App\Support\PhoneNumbers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TeacherApplicationResource extends JsonResource
{
    private bool $withHistory = false;

    /**
     * Also include the applicant's history (admin detail only): their other applications and
     * the reapplication cooldown. Never for the applicant themselves, since a match by name and
     * birth date may be someone else's account.
     */
    public function withHistory(): static
    {
        $this->withHistory = true;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            // The applicant's account (loaded withTrashed) and who submitted the application.
            'user' => $this->whenLoaded('user', fn () => $this->userSummary($this->user)),
            'submitted_by' => $this->whenLoaded('submittedBy', fn () => $this->userSummary($this->submittedBy)),
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'name' => $this->fullName(),
            'email' => $this->email,
            // E.164, e.g. +905551234567 (older rows may hold whatever was typed).
            'phone' => $this->phone,
            'phone_country' => $this->phone_country,
            'phone_display' => PhoneNumbers::display($this->phone),
            'nationality' => $this->nationality,
            'nationality_name' => Countries::ALL[$this->nationality] ?? $this->nationality,
            'birth_date' => $this->birth_date?->toDateString(),
            'gender' => $this->gender,
            'about' => $this->about,
            'status' => $this->status,
            'allowed_transitions' => $this->resource::TRANSITIONS[$this->status] ?? [],
            'notes' => $this->notes,
            // Detail view only (it stats the files). No URLs here: links are minted on demand
            // by TeacherApplicationFileController.
            'files' => $this->when($this->isDetail(), fn () => [
                'cv' => $this->fileInfo('cv', $this->cv_path),
                'video' => $this->fileInfo('video', $this->video_path),
            ]),
            'selections' => $this->when($this->isDetail(), fn () => $this->selections()),
            'history' => $this->when($this->withHistory, fn () => $this->history()),
            // Just the chosen category names, for the list view.
            'category_names' => $this->whenLoaded('categories', fn () => $this->categories
                ->map(fn (TeacherApplicationCategory $choice) => $choice->category?->name)
                ->filter()
                ->values()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, roles: list<string>, deleted_at: mixed}|null
     */
    private function userSummary(?User $user): ?array
    {
        return $user ? [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames()->values()->all(),
            'deleted_at' => $user->deleted_at,
        ] : null;
    }

    /**
     * The applicant's other applications (same account, or same name + birth date) and where
     * the reapplication cooldown stands, counted from their latest application.
     *
     * @return array<string, mixed>
     */
    private function history(): array
    {
        $applications = ApplicantHistory::sameApplicant($this->user_id, [$this->identity_key])
            ->with(['cooldownLiftedBy' => fn ($query) => $query->withTrashed()])
            ->latest()
            ->latest('id')
            ->get();
        $latest = $applications->first();

        return [
            'matches' => $applications->where('id', '!=', $this->id)->values()->map(fn (TeacherApplication $match) => [
                'id' => $match->id,
                'name' => $match->fullName(),
                'email' => $match->email,
                'status' => $match->status,
                'created_at' => $match->created_at,
                // Why it counts as the same applicant (either or both).
                'same_account' => $this->user_id !== null && $match->user_id === $this->user_id,
                'same_identity' => $match->identity_key === $this->identity_key,
            ])->all(),
            'cooldown_months' => ApplicantHistory::COOLDOWN_MONTHS,
            'latest_application_id' => $latest?->id,
            // Null when the applicant may apply now.
            'next_allowed_at' => ApplicantHistory::nextAllowedAt($latest),
            'cooldown_lifted_at' => $latest?->cooldown_lifted_at,
            'cooldown_lifted_by' => $latest?->cooldownLiftedBy?->name,
        ];
    }

    /** The detail endpoints load every selection relation; the list doesn't. */
    private function isDetail(): bool
    {
        return $this->relationLoaded('categories') && $this->relationLoaded('levels') && $this->relationLoaded('ageGroups');
    }

    /**
     * @return array{name: string, mime_type: string, size: int|null, previewable: bool}|null
     */
    private function fileInfo(string $file, ?string $path): ?array
    {
        if (! $path) {
            return null;
        }

        $disk = Storage::disk(TeacherApplicationService::DISK);
        $mimeType = TeacherApplicationService::mimeType($path);

        return [
            'name' => TeacherApplicationService::downloadName($this->resource, $file, $path),
            'mime_type' => $mimeType,
            'size' => $disk->exists($path) ? $disk->size($path) : null,
            // CVs preview only as PDF (older Word CVs are download-only); any video gets a
            // player, which reports formats the browser can't play.
            'previewable' => $file === 'cv' ? $mimeType === 'application/pdf' : str_starts_with($mimeType, 'video/'),
        ];
    }

    /**
     * The three selection tables reassembled into the tree the applicant filled in.
     * Catalog rows are loaded withTrashed, so a since-deleted category or level still shows.
     *
     * @return list<array<string, mixed>>
     */
    private function selections(): array
    {
        $summary = fn ($model) => $model ? ['id' => $model->id, 'name' => $model->name, 'deleted_at' => $model->deleted_at] : null;

        return $this->categories->map(function (TeacherApplicationCategory $choice) use ($summary) {
            $ageGroups = $this->ageGroups->where('category_id', $choice->category_id);

            return [
                'category' => $summary($choice->category),
                'levels' => $this->levels
                    ->where('category_id', $choice->category_id)
                    ->map(fn (TeacherApplicationLevel $level) => [
                        'level' => $summary($level->level),
                        'age_groups' => $ageGroups->where('level_id', $level->level_id)
                            ->map(fn (TeacherApplicationAgeGroup $group) => $group->age_group)->values()->all(),
                    ])->values()->all(),
                'age_groups' => $ageGroups->whereNull('level_id')
                    ->map(fn (TeacherApplicationAgeGroup $group) => $group->age_group)->values()->all(),
            ];
        })->values()->all();
    }
}
