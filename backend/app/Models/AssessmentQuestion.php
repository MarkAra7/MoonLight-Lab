<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class AssessmentQuestion extends Model
{
    use HasCustomId;

    protected $table = 'assessment_questions';

    protected $primaryKey = 'question_id';
    protected $idPrefix = 'AQ';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'assessment_id',
        'question_text',
        'question_type',
        'points',
        'display_order',
        'config',
    ];

    protected $casts = [
        'config' => 'array',
        'points' => 'integer',
        'display_order' => 'integer',
    ];

    public function assessment()
    {
        return $this->belongsTo(Assessment::class, 'assessment_id', 'assessment_id');
    }

    public function answers()
    {
        return $this->hasMany(AssessmentAnswer::class, 'question_id', 'question_id');
    }

    public function getCorrectTextAttribute(): ?string
    {
        return $this->config['correct_text'] ?? null;
    }

    public function getMatchModeAttribute(): string
    {
        return $this->config['match_mode'] ?? 'exact';
    }

    public function getLanguageAttribute(): string
    {
        return $this->config['language'] ?? 'js';
    }

    public function getStarterCodeAttribute(): string
    {
        return $this->config['starter_code'] ?? '';
    }

    /** @return array<int, array{input?: string, expected_output?: string, hidden?: bool}> */
    public function getTestsAttribute(): array
    {
        $tests = $this->config['tests'] ?? [];

        return is_array($tests) ? array_values($tests) : [];
    }
}
