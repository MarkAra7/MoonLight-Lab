<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class AssessmentAnswer extends Model
{
    use HasCustomId;

    protected $table = 'assessment_answers';

    protected $primaryKey = 'answer_id';
    protected $idPrefix = 'AA';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'question_id',
        'answer_text',
        'is_correct',
        'display_order',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
        'display_order' => 'integer',
    ];

    public function question()
    {
        return $this->belongsTo(AssessmentQuestion::class, 'question_id', 'question_id');
    }
}
