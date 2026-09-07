<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Media;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;

class QuizSeeder extends Seeder
{
    public function run(): void
    {
        $published = QuizStatus::where('status', 'published')->first();
        $draft = QuizStatus::where('status', 'draft')->first();

        if (! $published || ! $draft) {
            $this->command->warn('Quiz statuses not found. Run QuizStatusSeeder first.');

            return;
        }

        $users = [
            'teacher' => User::where('email', 'teacher@moonlightquiz.com')->first(),
            'student' => User::where('email', 'student@moonlightquiz.com')->first(),
            'individual' => User::where('email', 'individual@moonlightquiz.com')->first(),
        ];

        if (collect($users)->contains(null)) {
            $this->command->warn('Demo users not found. Run AdminSeeder first.');

            return;
        }

        $this->seedQuestionTypes();

        foreach ($this->quizDefinitions() as $definition) {
            $category = Category::firstOrCreate(
                ['name' => $definition['category']],
                ['description' => 'Quizzes about '.$definition['category']]
            );

            $quiz = Quiz::firstOrCreate(
                ['title' => $definition['title']],
                [
                    'description' => $definition['description'],
                    'author_id' => $users[$definition['author']]->id,
                    'quiz_status_id' => ($definition['status'] ?? 'published') === 'draft' ? $draft->quiz_status_id : $published->quiz_status_id,
                    'category_id' => $category->category_id,
                    'media_id' => $this->mediaFor($definition['media'])?->file_id,
                    'language' => 'en',
                    'difficulty' => $definition['difficulty'],
                    'time_limit' => $definition['time_limit'] ?? 10,
                    'views' => $definition['views'] ?? rand(15, 350),
                    'is_public' => $definition['is_public'] ?? true,
                ]
            );

            foreach ($definition['questions'] as $index => $questionData) {
                [$text, $type, $answers] = $questionData;

                $question = Question::firstOrCreate(
                    ['quiz_id' => $quiz->quiz_id, 'question_text' => $text],
                    ['question_type' => $type, 'display_order' => $index + 1]
                );

                foreach ($answers as $answerIndex => [$answerText, $isCorrect]) {
                    Answer::firstOrCreate(
                        ['question_id' => $question->question_id, 'answer_text' => $answerText],
                        ['is_correct' => $isCorrect, 'display_order' => $answerIndex + 1]
                    );
                }
            }

            $tags = collect($definition['tags'] ?? [])
                ->map(fn ($name) => Tag::firstOrCreate(['name' => $name])->tag_id)
                ->all();

            if ($tags) {
                $quiz->tags()->sync($tags);
            }
        }

        $this->command->info('Seeded '.count($this->quizDefinitions()).' quizzes with questions, answers, tags and media.');
    }

    protected function seedQuestionTypes(): void
    {
        $types = [
            ['question_type_id' => 'single_choice', 'name' => 'Single Choice', 'description' => 'Select one correct answer from several options.', 'display_order' => 1],
            ['question_type_id' => 'multiple_choice', 'name' => 'Multiple Choice', 'description' => 'Select all correct answers from several options.', 'display_order' => 2],
            ['question_type_id' => 'true_false', 'name' => 'True / False', 'description' => 'Determine whether the statement is true or false.', 'display_order' => 3],
            ['question_type_id' => 'text_input', 'name' => 'Text Input', 'description' => 'Type a short answer; matched with exact, case-insensitive or partial matching.', 'display_order' => 4],
            ['question_type_id' => 'theory', 'name' => 'Theory / Info', 'description' => 'Reading material only, no points.', 'display_order' => 5],
        ];

        foreach ($types as $type) {
            QuestionType::firstOrCreate(
                ['question_type_id' => $type['question_type_id']],
                $type
            );
        }
    }

    protected function mediaFor(?string $imageName): ?Media
    {
        if (! $imageName) {
            return null;
        }

        $path = 'images/system/'.$imageName;

        return Media::firstOrCreate(
            ['file_path' => $path],
            [
                'type' => 'file',
                'file_name' => $imageName,
                'mime_type' => str_ends_with($imageName, '.webp') ? 'image/webp' : 'image/jpeg',
                'file_size' => filesize(storage_path('app/public/'.$path)),
            ]
        );
    }

    protected function quizDefinitions(): array
    {
        return [
            [
                'title' => 'General Science Knowledge',
                'description' => 'Test your knowledge of basic science concepts including physics, chemistry, and biology.',
                'author' => 'teacher',
                'category' => 'Science',
                'media' => 'science.jpg',
                'difficulty' => 'easy',
                'time_limit' => 10,
                'tags' => ['science', 'biology', 'chemistry'],
                'questions' => [
                    ['What is the chemical symbol for water?', 'multiple_choice', [
                        ['H2O', true], ['CO2', false], ['NaCl', false], ['O2', false],
                    ]],
                    ['The Earth is closest to the Sun during which season?', 'multiple_choice', [
                        ['Winter', true], ['Summer', false], ['Spring', false], ['Autumn', false],
                    ]],
                    ['Light travels faster than sound.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['What planet is known as the Red Planet?', 'multiple_choice', [
                        ['Mars', true], ['Venus', false], ['Jupiter', false], ['Saturn', false],
                    ]],
                    ['The human body has 206 bones.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                ],
            ],
            [
                'title' => 'World History Essentials',
                'description' => 'From ancient civilizations to modern events — how well do you know world history?',
                'author' => 'teacher',
                'category' => 'History',
                'media' => 'history.jpg',
                'difficulty' => 'medium',
                'time_limit' => 15,
                'tags' => ['history', 'world'],
                'questions' => [
                    ['In which year did World War II end?', 'multiple_choice', [
                        ['1945', true], ['1944', false], ['1946', false], ['1943', false],
                    ]],
                    ['The Great Wall of China was built entirely during the Ming Dynasty.', 'true_false', [
                        ['True', false], ['False', true],
                    ]],
                    ['Who was the first President of the United States?', 'multiple_choice', [
                        ['George Washington', true], ['Thomas Jefferson', false], ['Abraham Lincoln', false], ['John Adams', false],
                    ]],
                    ['The ancient Mayan civilization was located in present-day Mexico and Central America.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                ],
            ],
            [
                'title' => 'Web Development Fundamentals',
                'description' => 'How well do you know HTML, CSS, JavaScript, and the web?',
                'author' => 'individual',
                'category' => 'Technology',
                'media' => 'technology.jpg',
                'difficulty' => 'medium',
                'time_limit' => 10,
                'tags' => ['technology', 'web development'],
                'questions' => [
                    ['What does HTML stand for?', 'multiple_choice', [
                        ['HyperText Markup Language', true], ['High-Level Text Machine Language', false], ['HyperTransfer Markup Language', false], ['Home Tool Markup Language', false],
                    ]],
                    ['CSS is used to structure the content of a web page.', 'true_false', [
                        ['True', false], ['False', true],
                    ]],
                    ['Which of the following is a JavaScript framework?', 'multiple_choice', [
                        ['React', true], ['Laravel', false], ['Django', false], ['Flask', false],
                    ]],
                ],
            ],
            [
                'title' => 'Capital Cities of the World',
                'description' => 'Match the country with its capital city in this fun geography quiz.',
                'author' => 'student',
                'category' => 'Geography',
                'media' => 'geography.jpg',
                'difficulty' => 'easy',
                'time_limit' => 8,
                'tags' => ['geography', 'capitals'],
                'questions' => [
                    ['What is the capital of France?', 'multiple_choice', [
                        ['Paris', true], ['London', false], ['Berlin', false], ['Madrid', false],
                    ]],
                    ['Canberra is the capital of Australia.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['What is the capital of Japan?', 'multiple_choice', [
                        ['Tokyo', true], ['Seoul', false], ['Beijing', false], ['Bangkok', false],
                    ]],
                ],
            ],
            [
                'title' => 'Advanced Physics Challenge',
                'description' => 'A challenging quiz on advanced physics topics. Still being built.',
                'author' => 'teacher',
                'category' => 'Science',
                'media' => 'science.jpg',
                'difficulty' => 'hard',
                'status' => 'draft',
                'is_public' => false,
                'tags' => ['science', 'physics'],
                'questions' => [
                    ['What is the speed of light in a vacuum (approximately)?', 'multiple_choice', [
                        ['3.0 × 10⁸ m/s', true], ['3.0 × 10⁶ m/s', false], ['1.5 × 10⁸ m/s', false], ['9.8 × 10⁸ m/s', false],
                    ]],
                ],
            ],
            [
                'title' => 'Music Theory Basics',
                'description' => 'Do you know your notes, scales, and musical terms?',
                'author' => 'individual',
                'category' => 'Music',
                'media' => 'music.jpg',
                'difficulty' => 'easy',
                'time_limit' => 8,
                'tags' => ['music'],
                'questions' => [
                    ['How many notes are in a standard major scale?', 'multiple_choice', [
                        ['7', true], ['5', false], ['8', false], ['12', false],
                    ]],
                    ['The treble clef is also known as the G clef.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                ],
            ],
            [
                'title' => 'Cybersecurity 101',
                'description' => 'Learn how to stay safe online with these cybersecurity basics.',
                'author' => 'teacher',
                'category' => 'Technology',
                'media' => 'technology.jpg',
                'difficulty' => 'medium',
                'time_limit' => 10,
                'tags' => ['technology', 'security'],
                'questions' => [
                    ['What does VPN stand for?', 'multiple_choice', [
                        ['Virtual Private Network', true], ['Very Protected Network', false], ['Virtual Public Network', false], ['Verified Private Node', false],
                    ]],
                    ['Two-factor authentication adds an extra layer of security.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                ],
            ],
            [
                'title' => 'World Landmarks',
                'description' => 'Identify famous landmarks from around the globe.',
                'author' => 'student',
                'category' => 'Geography',
                'media' => 'geography.jpg',
                'difficulty' => 'easy',
                'time_limit' => 6,
                'tags' => ['geography', 'landmarks'],
                'questions' => [
                    ['The Eiffel Tower is located in which city?', 'multiple_choice', [
                        ['Paris', true], ['Rome', false], ['London', false], ['Berlin', false],
                    ]],
                ],
            ],
            [
                'title' => 'Ancient Civilizations',
                'description' => 'Explore the rise and fall of ancient empires.',
                'author' => 'individual',
                'category' => 'History',
                'media' => 'history.jpg',
                'difficulty' => 'medium',
                'time_limit' => 12,
                'tags' => ['history', 'ancient'],
                'questions' => [
                    ['Which civilization built the pyramids of Giza?', 'multiple_choice', [
                        ['Ancient Egyptians', true], ['Ancient Greeks', false], ['Romans', false], ['Persians', false],
                    ]],
                    ['The Roman Empire fell in 476 AD.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                ],
            ],
            [
                'title' => 'Space Exploration',
                'description' => 'Blast off with this quiz about space missions and astronomy.',
                'author' => 'student',
                'category' => 'Science',
                'media' => 'science.jpg',
                'difficulty' => 'medium',
                'time_limit' => 10,
                'tags' => ['science', 'space'],
                'questions' => [
                    ['In what year did humans first land on the Moon?', 'multiple_choice', [
                        ['1969', true], ['1965', false], ['1972', false], ['1961', false],
                    ]],
                    ['Jupiter is the largest planet in our solar system.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['What is the name of the first artificial satellite?', 'multiple_choice', [
                        ['Sputnik 1', true], ['Explorer 1', false], ['Apollo 11', false], ['Voyager 1', false],
                    ]],
                ],
            ],
            [
                'title' => 'General Knowledge Trivia',
                'description' => 'Trivia across a wide range of topics — how many can you get right?',
                'author' => 'teacher',
                'category' => 'General Knowledge',
                'media' => 'general-knowledge.jpg',
                'difficulty' => 'easy',
                'time_limit' => 10,
                'tags' => ['general knowledge'],
                'questions' => [
                    ['How many continents are there on Earth?', 'multiple_choice', [
                        ['7', true], ['5', false], ['6', false], ['8', false],
                    ]],
                    ['The Great Barrier Reef is located off the coast of Australia.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['What is the largest mammal in the world?', 'multiple_choice', [
                        ['Blue whale', true], ['Elephant', false], ['Giraffe', false], ['Polar bear', false],
                    ]],
                ],
            ],
            [
                'title' => 'Programming Basics',
                'description' => 'Test your coding knowledge across multiple languages.',
                'author' => 'individual',
                'category' => 'Programming',
                'media' => 'programming.jpg',
                'difficulty' => 'medium',
                'time_limit' => 10,
                'tags' => ['programming', 'code'],
                'questions' => [
                    ['Which language runs directly in the browser?', 'multiple_choice', [
                        ['JavaScript', true], ['Python', false], ['C++', false], ['Java', false],
                    ]],
                    ['Python uses indentation to define code blocks.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['What does the `var` keyword do in JavaScript?', 'multiple_choice', [
                        ['Declares a variable', true], ['Defines a function', false], ['Creates a class', false], ['Imports a module', false],
                    ]],
                ],
            ],
            [
                'title' => 'English Language Essentials',
                'description' => 'Vocabulary, grammar and language skills for English learners.',
                'author' => 'student',
                'category' => 'Language',
                'media' => 'language.jpg',
                'difficulty' => 'easy',
                'time_limit' => 8,
                'tags' => ['language', 'english'],
                'questions' => [
                    ['What is the plural of "child"?', 'multiple_choice', [
                        ['Children', true], ['Childs', false], ['Childes', false], ['Childrens', false],
                    ]],
                    ['"There", "their" and "they\'re" are homophones.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['Which word is a synonym of "happy"?', 'multiple_choice', [
                        ['Joyful', true], ['Angry', false], ['Tired', false], ['Bored', false],
                    ]],
                ],
            ],
            [
                'title' => 'Sports Trivia',
                'description' => 'Rules, athletes, teams and championships from the world of sports.',
                'author' => 'teacher',
                'category' => 'Sports',
                'media' => 'sports.jpg',
                'difficulty' => 'easy',
                'time_limit' => 8,
                'tags' => ['sports'],
                'questions' => [
                    ['How many players are on a basketball team on the court?', 'multiple_choice', [
                        ['5', true], ['6', false], ['7', false], ['11', false],
                    ]],
                    ['The Olympics are held only during the summer.', 'true_false', [
                        ['True', false], ['False', true],
                    ]],
                    ['Which country won the first FIFA World Cup in 1930?', 'multiple_choice', [
                        ['Uruguay', true], ['Brazil', false], ['Italy', false], ['Argentina', false],
                    ]],
                ],
            ],
            [
                'title' => 'Blockbuster Movies',
                'description' => 'Film and television trivia for movie lovers.',
                'author' => 'student',
                'category' => 'Movies & TV',
                'media' => 'movies-tv.webp',
                'difficulty' => 'easy',
                'time_limit' => 8,
                'tags' => ['movies & tv'],
                'questions' => [
                    ['Which film features the character Jack Sparrow?', 'multiple_choice', [
                        ['Pirates of the Caribbean', true], ['The Mummy', false], ['Hook', false], ['Treasure Planet', false],
                    ]],
                    ['"Breaking Bad" is set in Albuquerque, New Mexico.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['Which studio produced "Toy Story"?', 'multiple_choice', [
                        ['Pixar', true], ['DreamWorks', false], ['Illumination', false], ['Blue Sky', false],
                    ]],
                ],
            ],
            [
                'title' => 'Classic Literature',
                'description' => 'Books, authors and literary analysis from the classics.',
                'author' => 'individual',
                'category' => 'Literature',
                'media' => 'literature.webp',
                'difficulty' => 'medium',
                'time_limit' => 10,
                'tags' => ['literature', 'books'],
                'questions' => [
                    ['Who wrote "Romeo and Juliet"?', 'multiple_choice', [
                        ['William Shakespeare', true], ['Charles Dickens', false], ['Jane Austen', false], ['Mark Twain', false],
                    ]],
                    ['"1984" was written by George Orwell.', 'true_false', [
                        ['True', true], ['False', false],
                    ]],
                    ['Which novel begins with "Call me Ishmael"?', 'multiple_choice', [
                        ['Moby-Dick', true], ['The Great Gatsby', false], ['Pride and Prejudice', false], ['Frankenstein', false],
                    ]],
                ],
            ],
        ];
    }
}
