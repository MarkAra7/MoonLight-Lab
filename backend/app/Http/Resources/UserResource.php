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

            if ($this->is_private && (!$this->requestUser || !$this->requestUser->is($this->resource))) {
                unset($data['first_name']);
                unset($data['country']);
            }
        }

        return $data;
    }
}
