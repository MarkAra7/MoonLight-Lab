<?php

namespace App\Models;

use App\Models\Media;
use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use App\Notifications\PasswordReset as PasswordResetNotification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasCustomId, SoftDeletes;

    protected $idPrefix = 'USR';

    protected $fillable = [
        'first_name',
        'last_name',
        'username',
        'email',
        'country',
        'preferred_language',
        'password',
        'role_id',
        'is_private',
        'avatar_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_private' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            if ($user->isDirty('first_name') || $user->isDirty('last_name') || !$user->name) {
                $user->name = $user->username ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
            }
        });

        static::updating(function (User $user) {
            if ($user->isDirty('avatar_id') && $user->getOriginal('avatar_id')) {
                $old = Media::find($user->getOriginal('avatar_id'));
                if ($old && $old->type === 'file' && $old->file_path) {
                    Storage::disk('public')->delete($old->file_path);
                }
                $old?->delete();
            }
        });
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function avatar()
    {
        return $this->belongsTo(Media::class, 'avatar_id', 'file_id');
    }

    public function quizzes()
    {
        return $this->hasMany(Quiz::class, 'author_id');
    }

    public function media()
    {
        return $this->hasMany(Media::class, 'user_id');
    }

    public function emailVerifications()
    {
        return $this->hasMany(EmailVerification::class);
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new PasswordResetNotification($token));
    }
}
