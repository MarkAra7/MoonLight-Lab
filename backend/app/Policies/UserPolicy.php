<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): Response
    {
        return $user->role?->title === Role::ADMIN
            ? Response::allow()
            : Response::deny('You do not have permission to view all users.');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): Response
    {
        if ($user->role?->title === Role::ADMIN) {
            return Response::allow();
        }

        if ($model->is_private && $user->id !== $model->id) {
            return Response::deny('This profile is private.');
        }

        return Response::allow();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): Response
    {
        return $user->role?->title === Role::ADMIN
            ? Response::allow()
            : Response::deny('You do not have permission to create users.');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): Response
    {
        return $user->id === $model->id
            ? Response::allow()
            : Response::deny('You do not have permission to update this user.');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): Response
    {
        return $user->id === $model->id
            ? Response::allow()
            : Response::deny('You do not have permission to delete this user.');
    }
}
