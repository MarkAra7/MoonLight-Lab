<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssessmentAttempt extends Model
{
    protected $table = 'assessment_attempts';

    protected $fillable = [
        'assessment_id',
        'assignment_id',
        'student_id',
        'attempt_number',
        'score',
        'total',
        'answers_data',
        'teacher_score',
        'teacher_feedback',
        'graded_by_id',
        'graded_at',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'answers_data' => 'array',
        'score' => 'decimal:2',
        'teacher_score' => 'decimal:2',
        'graded_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function assessment()
    {
        return $this->belongsTo(Assessment::class, 'assessment_id', 'assessment_id');
    }

    public function assignment()
    {
        return $this->belongsTo(AssessmentAssignment::class, 'assignment_id', 'id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function grader()
    {
        return $this->belongsTo(User::class, 'graded_by_id');
    }

    public function finalScore(): float
    {
        return (float) ($this->teacher_score ?? $this->score);
    }

    public function finalPercentage(): float
    {
        return $this->total > 0 ? round($this->finalScore() / $this->total * 100, 1) : 0.0;
    }
}
