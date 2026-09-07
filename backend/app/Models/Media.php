<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    use HasCustomId;

    protected $primaryKey = 'file_id';
    protected $idPrefix = 'MEDIA';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'type',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'url',
        'provider',
        'thumbnail_url',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function avatarOf()
    {
        return $this->hasOne(User::class, 'avatar_id', 'file_id');
    }

    public function quizzes()
    {
        return $this->hasMany(Quiz::class, 'media_id', 'file_id');
    }

    public function questions()
    {
        return $this->hasMany(Question::class, 'media_id', 'file_id');
    }

    public function answers()
    {
        return $this->hasMany(Answer::class, 'media_id', 'file_id');
    }

    public function categories()
    {
        return $this->hasMany(Category::class, 'media_id', 'file_id');
    }
}
