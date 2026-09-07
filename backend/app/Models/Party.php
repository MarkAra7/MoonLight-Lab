<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Party extends Model
{
    use HasCustomId;

    protected $primaryKey = 'id';

    protected $idPrefix = 'PTY';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'party_code',
        'host_id',
        'quiz_id',
        'status',
        'current_question_index',
        'question_started_at',
        'question_seconds',
        'max_players',
        'settings',
    ];

    protected $casts = [
        'question_started_at' => 'datetime',
        'question_seconds' => 'integer',
        'max_players' => 'integer',
        'settings' => 'array',
    ];

    public const STATUS_LOBBY = 'lobby';

    public const STATUS_PLAYING = 'playing';

    public const STATUS_RESULTS = 'results';

    public const STATUS_CANCELLED = 'cancelled';

    public function host()
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id', 'quiz_id');
    }

    public function players()
    {
        return $this->hasMany(PartyPlayer::class, 'party_id', 'id');
    }

    public function orderedPlayers()
    {
        return $this->players()->orderByDesc('score')->orderBy('total_time_ms');
    }

    public function questionEndsAt()
    {
        return $this->question_started_at?->copy()->addSeconds($this->question_seconds);
    }

    public function questionExpired(): bool
    {
        return $this->questionEndsAt() && $this->questionEndsAt()->isPast();
    }

    public function allowsGuests(): bool
    {
        return (bool) ($this->settings['allow_guests'] ?? false);
    }
}
