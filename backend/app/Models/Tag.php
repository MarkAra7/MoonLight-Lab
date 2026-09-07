<?php

namespace App\Models;
use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    use HasCustomId;
    
    protected $primaryKey = 'tag_id';
    protected $idPrefix = 'T';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
    ];

    public function quizzes()
    {
        return $this->belongsToMany(Quiz::class, 'quiz_tag', 'tag_id', 'quiz_id');
    }
}
