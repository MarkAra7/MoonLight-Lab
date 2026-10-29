<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Creating content publishes the account's email somewhere, so an
     * unverified address has to be confirmed first. Existing content stays
     * readable and editable; only new authoring is blocked.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->email_verified_at === null) {
            abort(403, 'Verify your email address before creating content.');
        }

        return $next($request);
    }
}
