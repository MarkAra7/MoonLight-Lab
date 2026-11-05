<?php

namespace Tests\Feature;

use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClassManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function user(string $role): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', $role)->first()->id,
        ]);
    }

    private function classroom(User $teacher, array $attributes = []): Classes
    {
        return Classes::create(array_merge([
            'name' => 'Class by '.$teacher->username,
            'teacher_id' => $teacher->id,
            'code' => strtoupper(Str::random(6)),
        ], $attributes));
    }

    public function test_teacher_can_create_a_class(): void
    {
        $teacher = $this->user('teacher');

        $response = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes', [
                'name' => 'Science 101',
                'description' => 'An introductory science class.',
            ])
            ->assertStatus(201)
            ->assertJsonPath('name', 'Science 101');

        $this->assertDatabaseHas('classes', [
            'id' => $response->json('id'),
            'teacher_id' => $teacher->id,
        ]);
        $this->assertSame(6, strlen($response->json('code')));
    }

    public function test_teacher_cannot_manage_another_teachers_class(): void
    {
        $owner = $this->user('teacher');
        $otherTeacher = $this->user('teacher');
        $class = $this->classroom($owner);

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/classes/'.$class->id)
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->putJson('/api/v1/teacher/classes/'.$class->id, ['name' => 'Hijacked'])
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/regenerate-code')
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/disable-code')
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->deleteJson('/api/v1/teacher/classes/'.$class->id)
            ->assertStatus(403);

        $this->assertDatabaseHas('classes', [
            'id' => $class->id,
            'name' => $class->name,
            'code' => $class->code,
        ]);
    }

    public function test_teacher_cannot_manage_students_of_another_teachers_class(): void
    {
        $owner = $this->user('teacher');
        $otherTeacher = $this->user('teacher');
        $student = $this->user('student');
        $class = $this->classroom($owner);

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/classes/'.$class->id.'/students')
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson('/api/v1/teacher/classes/'.$class->id.'/pending')
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/students', ['email' => $student->email])
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/approve/'.$student->id)
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/reject/'.$student->id)
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->deleteJson('/api/v1/teacher/classes/'.$class->id.'/students/'.$student->id)
            ->assertStatus(403);

        $this->assertDatabaseCount('class_student', 0);
    }

    public function test_teacher_can_add_and_remove_a_student(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $class = $this->classroom($teacher);

        $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/students', ['email' => $student->email])
            ->assertOk();

        $this->assertDatabaseHas('class_student', [
            'class_id' => $class->id,
            'student_id' => $student->id,
            'status' => 'active',
            'joined_by' => 'manual',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'type' => 'class_invite',
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->deleteJson('/api/v1/teacher/classes/'.$class->id.'/students/'.$student->id)
            ->assertOk();

        $this->assertDatabaseMissing('class_student', [
            'class_id' => $class->id,
            'student_id' => $student->id,
        ]);
    }

    public function test_teacher_cannot_add_a_user_who_is_not_a_student(): void
    {
        $teacher = $this->user('teacher');
        $otherTeacher = $this->user('teacher');
        $class = $this->classroom($teacher);

        $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/students', ['email' => $otherTeacher->email])
            ->assertStatus(422)
            ->assertJsonPath('message', 'User is not a student.');

        $this->assertDatabaseCount('class_student', 0);
    }

    public function test_teacher_can_approve_a_pending_student(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $class = $this->classroom($teacher);

        ClassStudent::create([
            'class_id' => $class->id,
            'student_id' => $student->id,
            'status' => 'pending',
            'joined_by' => 'code',
            'joined_at' => now(),
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/approve/'.$student->id)
            ->assertOk();

        $this->assertDatabaseHas('class_student', [
            'class_id' => $class->id,
            'student_id' => $student->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'type' => 'class_approved',
        ]);
    }

    public function test_teacher_can_regenerate_the_invite_code(): void
    {
        $teacher = $this->user('teacher');
        $class = $this->classroom($teacher);
        $oldCode = $class->code;

        $response = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/v1/teacher/classes/'.$class->id.'/regenerate-code')
            ->assertOk();

        $this->assertNotSame($oldCode, $response->json('code'));
        $this->assertSame(6, strlen($response->json('code')));
        $this->assertNotNull($response->json('code_expires_at'));
    }

    public function test_student_can_join_with_a_valid_code(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $class = $this->classroom($teacher);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/classes/join', ['code' => strtolower($class->code)])
            ->assertOk();

        $this->assertDatabaseHas('class_student', [
            'class_id' => $class->id,
            'student_id' => $student->id,
            'status' => 'active',
            'joined_by' => 'code',
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/classes/join', ['code' => $class->code])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Already a member of this class.');
    }

    public function test_student_cannot_join_with_an_expired_code(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $class = $this->classroom($teacher, ['code_expires_at' => now()->subHour()]);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/classes/join', ['code' => $class->code])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Code has expired.');

        $this->assertDatabaseCount('class_student', 0);
    }

    public function test_only_students_can_join_a_class(): void
    {
        $owner = $this->user('teacher');
        $otherTeacher = $this->user('teacher');
        $class = $this->classroom($owner);

        $this->actingAs($otherTeacher, 'sanctum')
            ->postJson('/api/v1/classes/join', ['code' => $class->code])
            ->assertStatus(403);

        $this->assertDatabaseCount('class_student', 0);
    }
}
