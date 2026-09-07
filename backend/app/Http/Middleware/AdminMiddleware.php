<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->relationLoaded('role')) {
            $user?->load('role');
        }

        if ($user?->role?->title !== Role::ADMIN) {
            abort(403, 'Unauthorized.');
        }

        return $next($request);
    }
}
