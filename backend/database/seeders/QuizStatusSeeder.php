<?php

namespace Database\Seeders;

use App\Models\QuizStatus;
use Illuminate\Database\Seeder;

class QuizStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = ['draft', 'published', 'archived'];

        foreach ($statuses as $status) {
            QuizStatus::firstOrCreate(['status' => $status]);
        }
    }
}
