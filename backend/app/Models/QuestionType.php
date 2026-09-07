<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuestionType extends Model
{
    protected $fillable = [
        'question_type_id',
        'name',
        'description',
        'config',
        'display_order',
    ];

    public function questions()
    {
        return $this->hasMany(Question::class, 'question_type', 'question_type_id');
    }
}
