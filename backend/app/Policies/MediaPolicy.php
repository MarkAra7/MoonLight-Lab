<?php

namespace App\Policies;

use App\Models\Media;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class MediaPolicy
{
    public function view(User $user, Media $media): Response
    {
        return $media->user_id === $user->id
            ? Response::allow()
            : Response::deny('Forbidden.');
    }

    public function create(User $user): Response
    {
        return Response::allow();
    }

    public function delete(User $user, Media $media): Response
    {
        return $media->user_id === $user->id
            ? Response::allow()
            : Response::deny('Forbidden.');
    }
}
