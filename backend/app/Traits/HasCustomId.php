<?php

namespace App\Traits;

use Illuminate\Support\Str;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 *
 * @method static void creating(\Closure $callback)
 * @method static void updating(\Closure $callback)
 * @method static void saving(\Closure $callback)
 * @method static void deleting(\Closure $callback)
 * @method static void retrieved(\Closure $callback)
 */
trait HasCustomId
{
    protected static function bootHasCustomId()
    {
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = static::generateUniqueId($model);
            }
        });
    }

    protected static function generateUniqueId($model): string
    {
        $prefix = property_exists($model, 'idPrefix')
            ? $model->idPrefix
            : strtoupper(substr(class_basename($model), 0, 4));

        $keyName = $model->getKeyName();

        do {
            $letters = strtoupper(Str::random(5));
            $numbers = rand(10000, 99999);
            $id = "{$prefix}{$letters}{$numbers}";
        } while ($model::where($keyName, $id)->exists());

        return $id;
    }

    public function getIncrementing()
    {
        return false;
    }

    public function getKeyType()
    {
        return 'string';
    }
}
