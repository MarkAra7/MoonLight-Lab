<?php
require 'vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
echo "Total quizzes: " . App\Models\Quiz::count() . "\n";
echo "Public published: " . App\Models\Quiz::where('is_public', true)->whereHas('quizStatus', function($q) { $q->where('status', 'published'); })->count() . "\n";
