<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        // Only roles the public sign-up form may offer. Teacher accounts are
        // created by an admin, so they must not appear here.
        return Role::whereIn('title', Role::REGISTERABLE)->get(['id', 'title', 'description']);
    }
}
