<?php

namespace App\Models;
use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasCustomId;
    
    protected $primaryKey = 'category_id';
    protected $idPrefix = 'CAT';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'description',
        'media_id',
    ];

    public function media()
    {
        return $this->belongsTo(Media::class, 'media_id', 'file_id');
    }

    public function quizzes()
    {
        return $this->hasMany(Quiz::class, 'category_id', 'category_id');
    }
}
