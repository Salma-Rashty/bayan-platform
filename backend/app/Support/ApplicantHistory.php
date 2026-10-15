<?php

namespace App\Support;

use App\Models\TeacherApplication;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Recognising the same teacher applicant across applications, and the reapplication cooldown.
 *
 * Two applications are the same applicant when they belong to the same account, or when first
 * name + last name + birth date match (case-insensitive, trimmed): that catches a second account.
 * An applicant may apply once every COOLDOWN_MONTHS, counted from their latest application,
 * unless an admin lifted the cooldown on that latest application.
 */
class ApplicantHistory
{
    public const COOLDOWN_MONTHS = 3;

    public static function identityKey(string $firstName, string $lastName, DateTimeInterface|string $birthDate): string
    {
        $normalise = fn (string $value) => mb_strtolower(trim(preg_replace('/\s+/u', ' ', $value)));
        $date = $birthDate instanceof DateTimeInterface ? $birthDate->format('Y-m-d') : substr($birthDate, 0, 10);

        return $normalise($firstName).'|'.$normalise($lastName).'|'.$date;
    }

    /**
     * Applications by the same applicant: the account's, plus any with one of the identity keys.
     *
     * @param  iterable<string>  $identityKeys
     * @return Builder<TeacherApplication>
     */
    public static function sameApplicant(?int $userId, iterable $identityKeys): Builder
    {
        $keys = collect($identityKeys)->filter()->unique()->values()->all();

        return TeacherApplication::query()->where(function (Builder $query) use ($userId, $keys) {
            $query->whereRaw('1 = 0')
                ->when($userId, fn (Builder $query) => $query->orWhere('user_id', $userId))
                ->when($keys !== [], fn (Builder $query) => $query->orWhereIn('identity_key', $keys));
        });
    }

    /**
     * @param  iterable<string>  $identityKeys
     */
    public static function latest(?int $userId, iterable $identityKeys): ?TeacherApplication
    {
        return self::sameApplicant($userId, $identityKeys)->latest()->latest('id')->first();
    }

    /**
     * When the applicant whose latest application is $latest may apply again, or null if they
     * may apply now (no application, cooldown over, or lifted by an admin).
     */
    public static function nextAllowedAt(?TeacherApplication $latest): ?CarbonImmutable
    {
        if (! $latest || $latest->cooldown_lifted_at) {
            return null;
        }

        $next = CarbonImmutable::parse($latest->created_at)->addMonthsNoOverflow(self::COOLDOWN_MONTHS);

        return $next->isFuture() ? $next : null;
    }
}
