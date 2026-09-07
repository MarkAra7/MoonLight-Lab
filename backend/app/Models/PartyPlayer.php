<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartyPlayer extends Model
{
    protected $fillable = [
        'party_id',
        'user_id',
        'nickname',
        'nickname_slug',
        'player_token',
        'score',
        'correct',
        'total',
        'total_time_ms',
        'rank',
        'joined_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'correct' => 'integer',
        'total' => 'integer',
        'total_time_ms' => 'integer',
        'rank' => 'integer',
        'joined_at' => 'datetime',
    ];

    public function party()
    {
        return $this->belongsTo(Party::class, 'party_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function answers()
    {
        return $this->hasMany(PartyAnswer::class, 'player_id', 'id');
    }
}
