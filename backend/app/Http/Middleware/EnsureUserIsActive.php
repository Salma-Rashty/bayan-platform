<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects requests from suspended users, so tokens issued before a suspension stop
 * working until the account is reactivated.
 */
class EnsureUserIsActive
{
    public const SUSPENDED_MESSAGE = 'Your account has been suspended. Please contact support.';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isSuspended()) {
            abort(403, self::SUSPENDED_MESSAGE);
        }

        return $next($request);
    }
}
