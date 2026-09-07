<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasCustomId;

    protected $primaryKey = 'question_id';

    protected $idPrefix = 'QST';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'quiz_id',
        'question_text',
        'question_type',
        'media_id',
        'display_order',
        'config',
    ];

    protected $casts = [
        'config' => 'array',
    ];

    protected $appends = ['correct_text', 'match_mode'];

    public function getCorrectTextAttribute(): ?string
    {
        return $this->config['correct_text'] ?? null;
    }

    public function getMatchModeAttribute(): string
    {
        return $this->config['match_mode'] ?? 'exact';
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id', 'quiz_id');
    }

    public function questionType()
    {
        return $this->belongsTo(QuestionType::class, 'question_type', 'question_type_id');
    }

    public function media()
    {
        return $this->belongsTo(Media::class, 'media_id', 'file_id');
    }

    public function answers()
    {
        return $this->hasMany(Answer::class, 'question_id', 'question_id');
    }
}
