<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\AssessmentAnswer;
use App\Models\AssessmentAssignment;
use App\Models\AssessmentAttempt;
use App\Models\AssessmentQuestion;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuestionTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssessmentTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $otherTeacher;

    private User $student;

    private User $classmate;

    private Classes $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuestionTypeSeeder::class);

        $this->teacher = $this->user('teacher');
        $this->otherTeacher = $this->user('teacher');
        $this->student = $this->user('student');
        $this->classmate = $this->user('student');

        $this->class = Classes::create([
            'name' => 'Assessment class',
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);

        $this->addMember($this->student);
        $this->addMember($this->classmate);
    }

    public function test_teacher_can_create_update_and_delete_an_assessment(): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessments', [
                'title' => 'Python basics',
                'description' => 'A short assessment.',
                'status' => 'published',
                'time_limit_minutes' => 20,
                'max_attempts' => 2,
            ])
            ->assertStatus(201)
            ->assertJsonPath('assessment.title', 'Python basics')
            ->assertJsonPath('assessment.status', 'published');

        $assessment = Assessment::firstOrFail();

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson('/api/v1/teacher/assessments/'.$assessment->assessment_id, ['title' => 'Renamed'])
            ->assertOk()
            ->assertJsonPath('assessment.title', 'Renamed');

        $this->actingAs($this->teacher, 'sanctum')
            ->deleteJson('/api/v1/teacher/assessments/'.$assessment->assessment_id)
            ->assertOk();

        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_teacher_cannot_manage_another_teachers_assessment(): void
    {
        $assessment = $this->assessment($this->teacher, 'Private assessment');

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/assessments/'.$assessment->assessment_id)
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->putJson('/api/v1/teacher/assessments/'.$assessment->assessment_id, ['title' => 'Stolen'])
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/results')
            ->assertStatus(403);
    }

    public function test_unverified_teacher_cannot_create_an_assessment(): void
    {
        $unverified = $this->user('teacher', false);

        $this->actingAs($unverified, 'sanctum')
            ->postJson('/api/v1/teacher/assessments', ['title' => 'Blocked'])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Verify your email address before creating content.');

        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_teacher_can_add_questions_answers_and_code_tests(): void
    {
        $assessment = $this->assessment($this->teacher);

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/questions', [
                'question_text' => 'Pick the odd one out',
                'question_type' => 'single_choice',
                'points' => 2,
                'config' => [],
            ])
            ->assertStatus(201)
            ->assertJsonPath('question_text', 'Pick the odd one out');

        $question = AssessmentQuestion::firstOrFail();

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessment-questions/'.$question->question_id.'/answers', [
                'answer_text' => 'Correct',
                'is_correct' => true,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('assessment_answers', [
            'question_id' => $question->question_id,
            'is_correct' => true,
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/questions', [
                'question_text' => 'Echo the input',
                'question_type' => 'code',
                'points' => 3,
                'config' => [
                    'language' => 'py',
                    'starter_code' => 'print(int(input()))',
                    'tests' => [
                        ['input' => "1\n", 'expected_output' => '1'],
                        ['input' => "2\n", 'expected_output' => '2', 'hidden' => true],
                    ],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('config.language', 'py');
    }

    public function test_code_question_requires_language_and_tests(): void
    {
        $assessment = $this->assessment($this->teacher);

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/questions', [
                'question_text' => 'Broken code task',
                'question_type' => 'code',
                'config' => [],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'A code question needs a language.');

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/questions', [
                'question_text' => 'Still broken',
                'question_type' => 'code',
                'config' => ['language' => 'py'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'A code question needs at least one test.');
    }

    public function test_personal_assignment_is_visible_only_to_its_student(): void
    {
        $assessment = $this->assessment($this->teacher);

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assessment-assignments', [
                'assessment_id' => $assessment->assessment_id,
                'class_id' => $this->class->id,
                'student_id' => $this->student->id,
                'title' => 'Personal task',
            ])
            ->assertStatus(201);

        $assignment = AssessmentAssignment::firstOrFail();

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonFragment(['id' => $assignment->id, 'kind' => 'assessment']);

        $this->actingAs($this->classmate, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonMissing(['id' => $assignment->id]);

        $this->assertSame(1, Notification::where('user_id', $this->student->id)
            ->where('type', 'assessment_new')->count());
        $this->assertSame(0, Notification::where('user_id', $this->classmate->id)
            ->where('type', 'assessment_new')->count());
    }

    public function test_student_questions_hide_correct_answers_and_hidden_tests(): void
    {
        $assessment = $this->assessment($this->teacher);
        $this->assign($assessment, null, 'Class task');

        $choice = AssessmentQuestion::create([
            'assessment_id' => $assessment->assessment_id,
            'question_text' => 'Two plus two?',
            'question_type' => 'single_choice',
        ]);
        AssessmentAnswer::create([
            'question_id' => $choice->question_id,
            'answer_text' => '4',
            'is_correct' => true,
        ]);

        AssessmentQuestion::create([
            'assessment_id' => $assessment->assessment_id,
            'question_text' => 'Echo',
            'question_type' => 'code',
            'config' => [
                'language' => 'py',
                'starter_code' => 'print(input())',
                'tests' => [
                    ['input' => "hello\n", 'expected_output' => 'hello'],
                    ['input' => "secret\n", 'expected_output' => 'secret', 'hidden' => true],
                ],
            ],
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/assessments/'.$assessment->assessment_id.'/questions')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonMissingPath('0.answers.0.is_correct')
            ->assertJsonMissing(['expected_output' => 'secret']);

        $response->assertJsonPath('1.code_config.starter_code', 'print(input())');
        $this->assertCount(1, $response->json('1.code_config.tests'));
    }

    public function test_student_submission_is_graded_on_the_server_with_hidden_tests(): void
    {
        Http::fake(fn ($request) => Http::response([
            'run' => [
                'stdout' => (string) ($request['stdin'] ?? ''),
                'stderr' => '',
                'code' => 0,
            ],
        ]));

        $assessment = $this->assessment($this->teacher);
        $assignment = $this->assign($assessment, $this->student, 'Graded task', 20);

        $choice = AssessmentQuestion::create([
            'assessment_id' => $assessment->assessment_id,
            'question_text' => 'Two plus two?',
            'question_type' => 'single_choice',
            'points' => 2,
        ]);
        $correct = AssessmentAnswer::create([
            'question_id' => $choice->question_id,
            'answer_text' => '4',
            'is_correct' => true,
        ]);
        $wrong = AssessmentAnswer::create([
            'question_id' => $choice->question_id,
            'answer_text' => '5',
            'is_correct' => false,
        ]);

        $code = AssessmentQuestion::create([
            'assessment_id' => $assessment->assessment_id,
            'question_text' => 'Echo the input',
            'question_type' => 'code',
            'points' => 3,
            'config' => [
                'language' => 'py',
                'starter_code' => 'print(input())',
                'tests' => [
                    ['input' => "one\n", 'expected_output' => 'one'],
                    ['input' => "two\n", 'expected_output' => 'two', 'hidden' => true],
                ],
            ],
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/assessments/'.$assessment->assessment_id.'/attempts/start', [
                'assignment_id' => $assignment->id,
            ])
            ->assertOk()
            ->assertJsonStructure(['started_at', 'deadline_at', 'attempt_token']);

        $start = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/assessments/'.$assessment->assessment_id.'/attempts/start', [
                'assignment_id' => $assignment->id,
            ])->json();

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/assessments/'.$assessment->assessment_id.'/attempts', [
                'assignment_id' => $assignment->id,
                'attempt_token' => $start['attempt_token'],
                'answers' => [
                    ['question_id' => $choice->question_id, 'answer_id' => $wrong->answer_id],
                    ['question_id' => $code->question_id, 'code' => 'print(input())'],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('attempt.score', 3)
            ->assertJsonPath('attempt.total', 5)
            ->assertJsonPath('attempt.attempt_number', 1)
            ->assertJsonMissing(['expected_output' => 'two']);

        $this->assertSame(3.0, (float) $response->json('attempt.final_score'));
        $this->assertSame(['passed' => 2, 'total' => 2], $response->json('questions.1.test_summary'));
        $this->assertDatabaseHas('assessment_attempts', [
            'student_id' => $this->student->id,
            'assignment_id' => $assignment->id,
            'score' => 3,
        ]);
    }

    public function test_expired_time_limit_is_rejected(): void
    {
        Http::preventStrayRequests();

        $assessment = $this->assessment($this->teacher, 'Timed', 1);
        $assignment = $this->assign($assessment, $this->student, 'Timed task', 1, 1);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/assessments/'.$assessment->assessment_id.'/attempts', [
                'assignment_id' => $assignment->id,
                'answers' => [],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Start the assessment before submitting.');
    }

    public function test_teacher_results_export_and_manual_grade(): void
    {
        $assessment = $this->assessment($this->teacher);
        $assignment = $this->assign($assessment, $this->student, 'Results task');

        $question = AssessmentQuestion::create([
            'assessment_id' => $assessment->assessment_id,
            'question_text' => 'Explain your answer',
            'question_type' => 'theory',
            'points' => 5,
        ]);

        $attempt = AssessmentAttempt::create([
            'assessment_id' => $assessment->assessment_id,
            'assignment_id' => $assignment->id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'score' => 0,
            'total' => 5,
            'answers_data' => ['answers' => []],
            'completed_at' => now(),
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/results')
            ->assertOk()
            ->assertJsonPath('results.0.student.id', $this->student->id)
            ->assertJsonPath('results.0.attempts_count', 1);

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/attempts/'.$attempt->id, [
                'teacher_score' => 4,
                'teacher_feedback' => 'Almost there.',
            ])
            ->assertOk()
            ->assertJsonPath('attempt.final_score', 4)
            ->assertJsonPath('attempt.teacher_feedback', 'Almost there.');

        $this->actingAs($this->teacher, 'sanctum')
            ->get('/api/v1/teacher/assessments/'.$assessment->assessment_id.'/export')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-assessment-attempts')
            ->assertOk()
            ->assertJsonPath('0.final_score', 4);
    }

    private function assessment(User $teacher, string $title = 'Assessment', int $timeLimit = 0): Assessment
    {
        return Assessment::create([
            'teacher_id' => $teacher->id,
            'title' => $title,
            'status' => 'published',
            'time_limit_minutes' => $timeLimit > 0 ? $timeLimit : null,
            'max_attempts' => 1,
        ]);
    }

    private function assign(Assessment $assessment, ?User $student, string $title, int $attempts = 1, int $timeLimit = 0): AssessmentAssignment
    {
        return AssessmentAssignment::create([
            'assessment_id' => $assessment->assessment_id,
            'class_id' => $this->class->id,
            'student_id' => $student?->id,
            'teacher_id' => $this->teacher->id,
            'title' => $title,
            'max_attempts' => $attempts,
            'time_limit_minutes' => $timeLimit > 0 ? $timeLimit : null,
        ]);
    }

    private function addMember(User $student): void
    {
        ClassStudent::create([
            'class_id' => $this->class->id,
            'student_id' => $student->id,
            'status' => 'active',
            'joined_by' => 'code',
            'joined_at' => now(),
        ]);
    }

    private function user(string $role, bool $verified = true): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', $role)->first()->id,
            'email_verified_at' => $verified ? now() : null,
        ]);
    }
}
