<?php

namespace App\Models;
use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Answer extends Model
{
    use HasCustomId;
    
    protected $primaryKey = 'answer_id';
    protected $idPrefix = 'ANS';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'question_id',
        'answer_text',
        'is_correct',
        'display_order',
        'config',
        'media_id',
    ];

    public function question()
    {
        return $this->belongsTo(Question::class, 'question_id', 'question_id');
    }

    public function media()
    {
        return $this->belongsTo(Media::class, 'media_id', 'file_id');
    }
}
