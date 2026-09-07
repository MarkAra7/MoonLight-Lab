<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    use HasCustomId;

    protected $primaryKey = 'rating_id';
    protected $idPrefix = 'RTG';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'quiz_id',
        'user_id',
        'rating',
    ];

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id', 'quiz_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
