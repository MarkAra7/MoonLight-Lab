<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Category;
use App\Models\Classes;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);
    }

    private function user(string $role = 'teacher'): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', $role)->first()->id,
        ]);
    }

    private function quiz(User $author, string $status = 'draft', bool $public = false): Quiz
    {
        return Quiz::create([
            'title' => 'Quiz by '.$author->username,
            'description' => 'A quiz used by the assignment tests.',
            'author_id' => $author->id,
            'quiz_status_id' => QuizStatus::where('status', $status)->first()->quiz_status_id,
            'category_id' => Category::firstOrCreate(['name' => 'Science'])->category_id,
            'difficulty' => 'easy',
            'is_public' => $public,
        ]);
    }

    private function classroom(User $teacher): Classes
    {
        return Classes::create([
            'name' => 'Class by '.$teacher->username,
            'teacher_id' => $teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);
    }

    private function assignment(Classes $class, Quiz $quiz, User $teacher): Assignment
    {
        return Assignment::create([
            'class_id' => $class->id,
            'quiz_id' => $quiz->quiz_id,
            'teacher_id' => $teacher->id,
            'title' => 'Existing assignment',
        ]);
    }

    private function payload(Classes $class, Quiz $quiz): array
    {
        return [
            'class_id' => $class->id,
            'quiz_id' => $quiz->quiz_id,
            'title' => 'Unit 1 assignment',
        ];
    }

    public function test_teacher_can_assign_their_own_quiz(): void
    {
        $teacher = $this->user();
        $class = $this->classroom($teacher);
        $quiz = $this->quiz($teacher);

        $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assignments', $this->payload($class, $quiz))
            ->assertStatus(201)
            ->assertJsonPath('class_id', $class->id)
            ->assertJsonPath('quiz_id', $quiz->quiz_id);

        $this->assertDatabaseHas('assignments', [
            'class_id' => $class->id,
            'quiz_id' => $quiz->quiz_id,
            'teacher_id' => $teacher->id,
        ]);
    }

    public function test_teacher_cannot_assign_another_teachers_private_quiz(): void
    {
        $owner = $this->user();
        $otherTeacher = $this->user();
        $class = $this->classroom($otherTeacher);
        $quiz = $this->quiz($owner, status: 'draft', public: false);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/teacher/assignments', $this->payload($class, $quiz))
            ->assertStatus(403);

        $this->assertDatabaseCount('assignments', 0);
    }

    public function test_teacher_cannot_assign_a_quiz_to_another_teachers_class(): void
    {
        $teacher = $this->user();
        $otherTeacher = $this->user();
        $class = $this->classroom($otherTeacher);
        $quiz = $this->quiz($teacher);

        $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assignments', $this->payload($class, $quiz))
            ->assertStatus(403);

        $this->assertDatabaseCount('assignments', 0);
    }

    public function test_teacher_cannot_view_another_teachers_assignment(): void
    {
        $owner = $this->user();
        $otherTeacher = $this->user();
        $class = $this->classroom($owner);
        $quiz = $this->quiz($owner);
        $assignment = $this->assignment($class, $quiz, $owner);

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/assignments/'.$assignment->id)
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/assignments/'.$assignment->id.'/results')
            ->assertStatus(403);
    }

    public function test_teacher_cannot_update_or_delete_another_teachers_assignment(): void
    {
        $owner = $this->user();
        $otherTeacher = $this->user();
        $class = $this->classroom($owner);
        $quiz = $this->quiz($owner);
        $assignment = $this->assignment($class, $quiz, $owner);

        $this->actingAs($otherTeacher, 'sanctum')
            ->putJson('/api/v1/teacher/assignments/'.$assignment->id, ['title' => 'Hijacked'])
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->deleteJson('/api/v1/teacher/assignments/'.$assignment->id)
            ->assertStatus(403);

        $this->assertDatabaseHas('assignments', [
            'id' => $assignment->id,
            'title' => 'Existing assignment',
        ]);
    }

    public function test_teacher_can_manage_their_own_assignment(): void
    {
        $teacher = $this->user();
        $class = $this->classroom($teacher);
        $quiz = $this->quiz($teacher);
        $assignment = $this->assignment($class, $quiz, $teacher);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/teacher/assignments/'.$assignment->id)
            ->assertOk()
            ->assertJsonPath('id', $assignment->id);

        $this->actingAs($teacher, 'sanctum')
            ->putJson('/api/v1/teacher/assignments/'.$assignment->id, ['title' => 'Renamed assignment'])
            ->assertOk()
            ->assertJsonPath('title', 'Renamed assignment');

        $this->actingAs($teacher, 'sanctum')
            ->deleteJson('/api/v1/teacher/assignments/'.$assignment->id)
            ->assertOk();

        $this->assertDatabaseMissing('assignments', ['id' => $assignment->id]);
    }
}
