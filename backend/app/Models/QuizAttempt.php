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
        'total',
        'answers_data',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'answers_data' => 'array',
        'score' => 'decimal:2',
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
}
