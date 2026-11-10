<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuizAttempt extends Model
{
    protected $table = 'quiz_attempts';

    protected $fillable = [
        'assignment_id',
        'quiz_id',
        'student_id',
        'attempt_number',
        'score',
        'teacher_score',
        'teacher_feedback',
        'graded_by_id',
        'graded_at',
        'total',
        'answers_data',
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

    public function assignment()
    {
        return $this->belongsTo(Assignment::class, 'assignment_id', 'id');
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id', 'quiz_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function grader()
    {
        return $this->belongsTo(User::class, 'graded_by_id');
    }

    /** The teacher's decision wins over the automatic score when present. */
    public function finalScore(): float
    {
        return (float) ($this->teacher_score ?? $this->score);
    }

    public function finalPercentage(): float
    {
        return $this->total > 0 ? round($this->finalScore() / $this->total * 100, 1) : 0.0;
    }
}
