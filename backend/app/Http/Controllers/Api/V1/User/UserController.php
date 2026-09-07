<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class UserController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', User::class);

        return UserResource::collection(User::with('role')->paginate(50));
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        return UserResource::make($user)->response()->setStatusCode(201);
    }

    public function show(User $user)
    {
        Gate::authorize('view', $user);

        return UserResource::make($user);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $user->update($request->validated());

        return UserResource::make($user);
    }

    public function destroy(User $user)
    {
        Gate::authorize('delete', $user);

        $user->delete();

        return response()->noContent();
    }

    public function authenticatedUser(Request $request)
    {
        return UserResource::make($request->user()->load(['role', 'avatar']));
    }

    public function publicProfile(Request $request, string $username)
    {
        $user = User::where('username', $username)->with(['role', 'avatar'])->firstOrFail();

        return UserResource::make($user)->withProfile(true, $request->user());
    }
}
