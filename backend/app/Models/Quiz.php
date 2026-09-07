<?php

namespace App\Models;
use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quiz extends Model
{
    use HasCustomId, SoftDeletes;
    
    protected $primaryKey = 'quiz_id';
    protected $idPrefix = 'Q';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'title',
        'description',
        'author_id',
        'quiz_status_id',
        'category_id',
        'media_id',
        'language',
        'difficulty',
        'time_limit',
        'views',
        'average_score',
        'config',
        'is_public',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function quizStatus()
    {
        return $this->belongsTo(QuizStatus::class, 'quiz_status_id', 'quiz_status_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function media()
    {
        return $this->belongsTo(Media::class, 'media_id', 'file_id');
    }

    public function questions()
    {
        return $this->hasMany(Question::class, 'quiz_id', 'quiz_id');
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'quiz_tag', 'quiz_id', 'tag_id');
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class, 'quiz_id', 'quiz_id');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class, 'quiz_id', 'quiz_id');
    }
}
