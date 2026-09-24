<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Media;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Programming', 'description' => 'Test your coding knowledge across multiple languages', 'image' => 'Programming.jpg'],
            ['name' => 'Science', 'description' => 'Biology, chemistry, physics and more', 'image' => 'Science.jpg'],
            ['name' => 'History', 'description' => 'World history from ancient to modern times', 'image' => 'History.jpg'],
            ['name' => 'Mathematics', 'description' => 'Algebra, geometry, calculus and logic puzzles', 'image' => 'Mathematics.jpg'],
            ['name' => 'Geography', 'description' => 'Countries, capitals, landmarks and cultures', 'image' => 'Geography.jpg'],
            ['name' => 'General Knowledge', 'description' => 'Trivia across a wide range of topics', 'image' => 'General Knowledge.jpg'],
            ['name' => 'Language', 'description' => 'Vocabulary, grammar and language skills', 'image' => 'Language.jpg'],
            ['name' => 'Music', 'description' => 'Instruments, theory, artists and genres', 'image' => 'Music.jpg'],
            ['name' => 'Movies & TV', 'description' => 'Film and television trivia', 'image' => 'Movies & TV.webp'],
            ['name' => 'Sports', 'description' => 'Rules, athletes, teams and championships', 'image' => 'Sports.jpg'],
            ['name' => 'Technology', 'description' => 'Gadgets, software, and tech history', 'image' => 'Technology.jpg'],
            ['name' => 'Literature', 'description' => 'Books, authors and literary analysis', 'image' => 'Literature.webp'],
        ];

        foreach ($categories as $data) {
            $ext = strtolower(pathinfo($data['image'], PATHINFO_EXTENSION));
            $storedPath = 'images/system/'.Str::slug($data['name']).'.'.$ext;
            $mediaId = null;

            if (Storage::disk('public')->exists($storedPath)) {
                $media = Media::firstOrCreate(
                    ['file_path' => $storedPath],
                    [
                        'type' => 'file',
                        'file_name' => $data['image'],
                        'mime_type' => Storage::disk('public')->mimeType($storedPath),
                        'file_size' => Storage::disk('public')->size($storedPath),
                    ]
                );

                $mediaId = $media->file_id;
            }

            Category::updateOrCreate(
                ['name' => $data['name']],
                [
                    'description' => $data['description'],
                    'media_id' => $mediaId,
                ]
            );
        }
    }
}
