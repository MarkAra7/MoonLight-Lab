<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    protected bool $isProfileView = false;
    protected $requestUser = null;

    public function withProfile(bool $profile, $requestUser = null): static
    {
        $this->isProfileView = $profile;
        $this->requestUser = $requestUser;
        return $this;
    }

    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'username' => $this->username,
            'name' => $this->name,
            'email' => $this->email,
            'country' => $this->country,
            'preferred_language' => $this->preferred_language,
            'role_id' => $this->role_id,
            'avatar_id' => $this->avatar_id,
            'is_private' => $this->is_private,
            'role' => $this->whenLoaded('role'),
            'avatar' => $this->whenLoaded('avatar'),
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        if ($this->isProfileView) {
            $data['is_verified'] = $this->email_verified_at !== null;

            $isOwner = $this->requestUser !== null && $this->requestUser->is($this->resource);

            // Email is personal data — never expose it to other users, even on
            // public profiles. Only the profile owner sees their own email.
            if (!$isOwner) {
                unset($data['email']);
                unset($data['email_verified_at']);
            }

            // Defense in depth: even if a private profile somehow renders,
            // hide personal fields from everyone except the owner.
            if ($this->is_private && !$isOwner) {
                unset($data['first_name']);
                unset($data['last_name']);
                unset($data['country']);
            }
        }

        return $data;
    }
}
