<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'MoonLight Lab API',
        'status' => 'ok',
    ]);
});
