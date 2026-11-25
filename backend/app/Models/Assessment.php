<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Assessment extends Model
{
    use HasCustomId;

    protected $primaryKey = 'assessment_id';
    protected $idPrefix = 'ASM';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'teacher_id',
        'title',
        'description',
        'status',
        'time_limit_minutes',
        'max_attempts',
        'opens_at',
        'due_at',
    ];

    protected $casts = [
        'time_limit_minutes' => 'integer',
        'max_attempts' => 'integer',
        'opens_at' => 'datetime',
        'due_at' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function questions()
    {
        return $this->hasMany(AssessmentQuestion::class, 'assessment_id', 'assessment_id');
    }

    public function assignments()
    {
        return $this->hasMany(AssessmentAssignment::class, 'assessment_id', 'assessment_id');
    }

    public function attempts()
    {
        return $this->hasMany(AssessmentAttempt::class, 'assessment_id', 'assessment_id');
    }

    public function totalPoints(): int
    {
        return (int) $this->questions()->where('question_type', '!=', 'theory')->sum('points');
    }
}
