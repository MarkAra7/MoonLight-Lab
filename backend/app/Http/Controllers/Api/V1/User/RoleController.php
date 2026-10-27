<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RoleController extends Controller
{
    public function index()
    {
        // Only roles the public sign-up form may offer. Teacher accounts are
        // created by an admin, so they must not appear here.
        return Role::whereIn('title', Role::REGISTERABLE)->get(['id', 'title', 'description']);
    }

    /**
     * Every role, for the admin account management screen. Teacher accounts
     * can only be created here, so the admin needs the full list.
     */
    public function adminIndex()
    {
        Gate::authorize('viewAny', User::class);

        return Role::query()->orderBy('id')->get(['id', 'title', 'description']);
    }
}
