<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Quiz;
use App\Models\Rating;
use App\Models\User;
use Illuminate\Database\Seeder;

class ActivitySeeder extends Seeder
{
    public function run(): void
    {
        $userEmails = [
            'teacher' => 'teacher@moonlightquiz.com',
            'student' => 'student@moonlightquiz.com',
            'individual' => 'individual@moonlightquiz.com',
        ];

        $users = collect($userEmails)->map(fn ($email) => User::where('email', $email)->first());

        if ($users->contains(null)) {
            $this->command->warn('Demo users not found. Run AdminSeeder first.');

            return;
        }

        $published = Quiz::whereHas('quizStatus', fn ($q) => $q->where('status', 'published'))->get();

        $ratingValues = [4, 5, 4, 3, 5, 4, 4, 5, 3, 5];

        foreach ($published as $quiz) {
            $raters = $users->reject(fn ($user) => $user->id === $quiz->author_id)->values();

            foreach ($raters as $index => $rater) {
                Rating::firstOrCreate(
                    ['quiz_id' => $quiz->quiz_id, 'user_id' => $rater->id],
                    ['rating' => $ratingValues[($index + strlen($quiz->quiz_id)) % count($ratingValues)]]
                );
            }

            $commentTemplates = [
                'Great quiz! Learned a lot.',
                'This was fun, could use a few harder questions.',
                'Perfect for a quick revision session.',
                'Well written questions, thanks for sharing!',
                'Got most of them right — nicely done.',
            ];

            $commentIndex = $quiz->questions()->count() % count($commentTemplates);

            $firstUser = $users->first();
            $first = Comment::firstOrCreate(
                ['quiz_id' => $quiz->quiz_id, 'user_id' => $firstUser->id, 'body' => $commentTemplates[$commentIndex]],
                ['body' => $commentTemplates[$commentIndex]]
            );

            $secondUser = $users->last();
            Comment::firstOrCreate(
                ['quiz_id' => $quiz->quiz_id, 'user_id' => $secondUser->id, 'body' => 'Agreed, the questions are really useful.'],
                ['parent_id' => $first->comment_id]
            );
        }

        $this->command->info('Seeded ratings and comments for all published quizzes.');
    }
}
