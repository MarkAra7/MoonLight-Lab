<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EmailVerification extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = Str::uuid()->toString();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function generateFor(User $user): self
    {
        return static::create([
            'user_id' => $user->id,
            'expires_at' => now()->addMinutes(config('app.verification.expire', 15)),
        ]);
    }

    public function isValid(): bool
    {
        return !$this->expires_at->isPast();
    }
}
