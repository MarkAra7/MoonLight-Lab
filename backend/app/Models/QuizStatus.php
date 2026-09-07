<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class QuizStatus extends Model
{
    protected $primaryKey = 'quiz_status_id';

    protected $fillable = [
        'status',
    ];

    public function quizzes()
    {
        return $this->hasMany(Quiz::class, 'quiz_status_id', 'quiz_status_id');
    }
}
