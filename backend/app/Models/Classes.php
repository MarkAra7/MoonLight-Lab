<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Classes extends Model
{
    use HasCustomId, SoftDeletes;

    protected $table = 'classes';
    protected $primaryKey = 'id';
    protected $idPrefix = 'CLS';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'description',
        'teacher_id',
        'code',
        'code_expires_at',
    ];

    protected $casts = [
        'code_expires_at' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function students()
    {
        return $this->belongsToMany(User::class, 'class_student', 'class_id', 'student_id')
            ->withPivot('status', 'joined_by', 'added_by', 'joined_at')
            ->wherePivot('status', 'active');
    }

    public function pendingStudents()
    {
        return $this->belongsToMany(User::class, 'class_student', 'class_id', 'student_id')
            ->withPivot('status', 'joined_at')
            ->wherePivot('status', 'pending');
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class, 'class_id', 'id');
    }

    public function isCodeValid(): bool
    {
        return $this->code_expires_at === null || $this->code_expires_at->isFuture();
    }
}
