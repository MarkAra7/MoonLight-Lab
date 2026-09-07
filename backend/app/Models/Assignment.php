<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    use HasCustomId;

    protected $primaryKey = 'id';
    protected $idPrefix = 'ASN';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'class_id',
        'quiz_id',
        'teacher_id',
        'title',
        'description',
        'max_attempts',
        'time_limit_minutes',
        'opens_at',
        'due_at',
    ];

    protected $casts = [
        'opens_at' => 'datetime',
        'due_at' => 'datetime',
        'max_attempts' => 'integer',
        'time_limit_minutes' => 'integer',
    ];

    public function class()
    {
        return $this->belongsTo(Classes::class, 'class_id', 'id');
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id', 'quiz_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attempts()
    {
        return $this->hasMany(QuizAttempt::class, 'assignment_id', 'id');
    }

    public function isOpen(): bool
    {
        if ($this->opens_at && $this->opens_at->isFuture()) return false;
        if ($this->due_at && $this->due_at->isPast()) return false;
        return true;
    }

    public function studentAttempts($studentId)
    {
        return $this->attempts()->where('student_id', $studentId)->orderBy('attempt_number');
    }

    public function attemptsRemaining($studentId): int
    {
        if ($this->max_attempts === 0) return PHP_INT_MAX;
        $count = $this->attempts()->where('student_id', $studentId)->count();
        return max(0, $this->max_attempts - $count);
    }
}
