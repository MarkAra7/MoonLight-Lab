<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        return Role::whereNotIn('title', [Role::ADMIN])->get(['id', 'title', 'description']);
    }
}
