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
    public function index(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        $term = trim((string) $request->input('q'));

        $users = User::query()
            ->with(['role', 'avatar'])
            ->when($term !== '', fn ($query) => $query->where(fn ($match) => $match
                ->where('username', 'like', '%'.$term.'%')
                ->orWhere('name', 'like', '%'.$term.'%')
                ->orWhere('email', 'like', '%'.$term.'%')))
            ->latest()
            ->paginate(50);

        return UserResource::collection($users);
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

    /**
     * Admin-only role change. Kept separate from `update` because an admin
     * must not need the target user's current password to promote them.
     */
    public function updateRole(Request $request, User $user)
    {
        Gate::authorize('assignRole', $user);

        $validated = $request->validate([
            'role_id' => ['required', 'exists:roles,id'],
        ]);

        $user->update(['role_id' => $validated['role_id']]);

        return UserResource::make($user->load('role'));
    }

    public function authenticatedUser(Request $request)
    {
        return UserResource::make($request->user()->load(['role', 'avatar']));
    }

    public function publicProfile(Request $request, string $username)
    {
        $user = User::where('username', $username)->with(['role', 'avatar'])->firstOrFail();

        Gate::authorize('view', $user);

        return UserResource::make($user)->withProfile(true, $request->user());
    }

    public function search(Request $request)
    {
        $term = trim((string) $request->input('q'));

        $users = User::query()
            ->where('is_private', false)
            ->with(['role', 'avatar'])
            ->when($request->filled('q'), fn($query) => $query->where(fn($w) => $w
                ->where('username', 'like', '%'.$term.'%')
                ->orWhere('name', 'like', '%'.$term.'%')), fn($query) => $query->whereRaw('1 = 0'))
            ->latest()
            ->paginate($this->perPage($request));

        $resource = UserResource::collection($users);
        $resource->each(fn (UserResource $user) => $user->withProfile(true, null));

        return $resource;
    }

    private function perPage(Request $request): int
    {
        return min(max((int) $request->input('per_page', 12), 1), 50);
    }
}
