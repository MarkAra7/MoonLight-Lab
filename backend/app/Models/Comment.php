<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use HasCustomId, SoftDeletes;

    protected $primaryKey = 'comment_id';
    protected $idPrefix = 'CMT';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'quiz_id',
        'user_id',
        'parent_id',
        'body',
    ];

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id', 'quiz_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Comment::class, 'parent_id', 'comment_id');
    }

    public function replies()
    {
        return $this->hasMany(Comment::class, 'parent_id', 'comment_id');
    }
}
