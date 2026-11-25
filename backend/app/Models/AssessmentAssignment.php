<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class AssessmentAssignment extends Model
{
    use HasCustomId;

    protected $table = 'assessment_assignments';

    protected $primaryKey = 'id';
    protected $idPrefix = 'ASA';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'assessment_id',
        'class_id',
        'student_id',
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

    public function assessment()
    {
        return $this->belongsTo(Assessment::class, 'assessment_id', 'assessment_id');
    }

    public function class()
    {
        return $this->belongsTo(Classes::class, 'class_id', 'id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attempts()
    {
        return $this->hasMany(AssessmentAttempt::class, 'assignment_id', 'id');
    }

    public function isOpen(): bool
    {
        if ($this->opens_at && $this->opens_at->isFuture()) return false;
        if ($this->due_at && $this->due_at->isPast()) return false;

        return true;
    }

    /** Personal assignments are visible only to their target student. */
    public function isForStudent(string $studentId): bool
    {
        return $this->student_id === null || (string) $this->student_id === (string) $studentId;
    }

    public function attemptsRemaining(string $studentId): int
    {
        if ($this->max_attempts === 0) return PHP_INT_MAX;

        $count = $this->attempts()->where('student_id', $studentId)->count();

        return max(0, $this->max_attempts - $count);
    }
}
