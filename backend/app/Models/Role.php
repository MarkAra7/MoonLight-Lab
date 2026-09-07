<?php

namespace App\Models;

use App\Traits\HasCustomId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory, HasCustomId;

    public const ADMIN = 'admin';
    public const TEACHER = 'teacher';
    public const STUDENT = 'student';
    public const INDIVIDUAL = 'individual';

    protected $idPrefix = 'ROLE';

    protected $fillable = [
        'title',
        'description',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
