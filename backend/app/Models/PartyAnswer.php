<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartyAnswer extends Model
{
    protected $fillable = [
        'party_id',
        'player_id',
        'question_index',
        'answer_id',
        'is_correct',
        'points',
        'answered_at_ms',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
        'points' => 'integer',
        'answered_at_ms' => 'integer',
    ];

    public function party()
    {
        return $this->belongsTo(Party::class, 'party_id', 'id');
    }

    public function player()
    {
        return $this->belongsTo(PartyPlayer::class, 'player_id', 'id');
    }
}
