<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssignmentExportTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $student;

    private User $silentStudent;

    private Classes $class;

    private Assignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->teacher = $this->user('teacher', [
            'first_name' => 'Tina',
            'last_name' => 'Teacher',
            'email' => 'teacher@example.com',
        ]);
        $this->student = $this->user('student', [
            'first_name' => 'Ada',
            'last_name' => 'Able',
            'email' => 'ada@example.com',
        ]);
        $this->silentStudent = $this->user('student', [
            'first_name' => 'Ben',
            'last_name' => 'Baker',
            'email' => 'ben@example.com',
        ]);

        $quiz = Quiz::create([
            'title' => 'Export quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);

        $this->class = Classes::create([
            'name' => 'Export class',
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);

        $this->assignment = Assignment::create([
            'class_id' => $this->class->id,
            'quiz_id' => $quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'Export assignment',
            'max_attempts' => 3,
        ]);

        $this->addMember($this->student);
        $this->addMember($this->silentStudent);
    }

    public function test_owner_downloads_a_csv_with_attempts_and_enrolled_students(): void
    {
        $this->attempt($this->student, 1, 2);

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->get("/api/v1/teacher/assignments/{$this->assignment->id}/export");

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString(
            'attachment; filename=export-assignment-results.csv',
            $response->headers->get('content-disposition')
        );

        $rows = $this->csvRows($response->streamedContent());

        $this->assertSame(
            [
                'Student',
                'Email',
                'Attempt',
                'Automatic score',
                'Teacher score',
                'Final score',
                'Total',
                'Percentage',
                'Completed at',
                'Graded at',
                'Teacher feedback',
            ],
            $rows[0]
        );
        $this->assertCount(3, $rows);
        $this->assertSame('Ada Able', $rows[1][0]);
        $this->assertSame('ada@example.com', $rows[1][1]);
        $this->assertSame('1', $rows[1][2]);
        $this->assertSame('1', $rows[1][3]);
        $this->assertSame('', $rows[1][4]);
        $this->assertSame('1', $rows[1][5]);
        $this->assertSame('2', $rows[1][6]);
        $this->assertSame('50', $rows[1][7]);
        $this->assertNotSame('', $rows[1][8]);
        $this->assertSame('', $rows[1][9]);
        $this->assertSame('', $rows[1][10]);
        $this->assertSame(['Ben Baker', 'ben@example.com'], array_slice($rows[2], 0, 2));
        $this->assertSame(['', '', '', '', '', '', '', '', ''], array_slice($rows[2], 2));
    }

    public function test_csv_contains_the_manual_grade_when_the_teacher_overrode_the_score(): void
    {
        $this->attempt($this->student, 1, 2, teacherScore: 2, feedback: 'Good work.');

        $rows = $this->csvRows(
            $this->actingAs($this->teacher, 'sanctum')
                ->get("/api/v1/teacher/assignments/{$this->assignment->id}/export")
                ->assertOk()
                ->streamedContent()
        );

        $this->assertSame('1', $rows[1][3]);
        $this->assertSame('2', $rows[1][4]);
        $this->assertSame('2', $rows[1][5]);
        $this->assertSame('2', $rows[1][6]);
        $this->assertSame('100', $rows[1][7]);
        $this->assertSame('Good work.', $rows[1][10]);
    }

    public function test_export_of_a_personal_assignment_only_lists_that_student(): void
    {
        $personal = Assignment::create([
            'class_id' => $this->class->id,
            'student_id' => $this->student->id,
            'quiz_id' => $this->assignment->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'Personal export',
        ]);

        QuizAttempt::create([
            'assignment_id' => $personal->id,
            'quiz_id' => $personal->quiz_id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'score' => 1,
            'total' => 2,
            'answers_data' => ['answers' => []],
            'completed_at' => now(),
        ]);

        $rows = $this->csvRows(
            $this->actingAs($this->teacher, 'sanctum')
                ->get("/api/v1/teacher/assignments/{$personal->id}/export")
                ->assertOk()
                ->streamedContent()
        );

        $this->assertCount(2, $rows);
        $this->assertSame(['Ada Able', 'ada@example.com'], array_slice($rows[1], 0, 2));
        $this->assertSame('1', $rows[1][2]);
        $this->assertSame(
            [],
            array_values(array_filter($rows, fn (array $row) => in_array('ben@example.com', $row, true)))
        );
    }

    public function test_export_of_a_personal_assignment_without_attempts_still_lists_the_student(): void
    {
        $personal = Assignment::create([
            'class_id' => $this->class->id,
            'student_id' => $this->student->id,
            'quiz_id' => $this->assignment->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'Personal export',
        ]);

        $rows = $this->csvRows(
            $this->actingAs($this->teacher, 'sanctum')
                ->get("/api/v1/teacher/assignments/{$personal->id}/export")
                ->assertOk()
                ->streamedContent()
        );

        $this->assertCount(2, $rows);
        $this->assertSame(['Ada Able', 'ada@example.com'], array_slice($rows[1], 0, 2));
        $this->assertSame('', $rows[1][2]);
    }

    public function test_export_without_students_is_still_a_valid_csv(): void
    {
        $this->class->students()->detach();

        $rows = $this->csvRows(
            $this->actingAs($this->teacher, 'sanctum')
                ->get("/api/v1/teacher/assignments/{$this->assignment->id}/export")
                ->assertOk()
                ->streamedContent()
        );

        $this->assertCount(1, $rows);
        $this->assertSame('Student', $rows[0][0]);
        $this->assertSame('Email', $rows[0][1]);
    }

    public function test_another_teacher_and_guests_cannot_export(): void
    {
        $this->actingAs($this->user('teacher'), 'sanctum')
            ->getJson("/api/v1/teacher/assignments/{$this->assignment->id}/export")
            ->assertForbidden();

        $this->app['auth']->forgetGuards();

        $this->getJson("/api/v1/teacher/assignments/{$this->assignment->id}/export")
            ->assertUnauthorized();
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

    private function attempt(
        User $student,
        float $score,
        int $total,
        ?float $teacherScore = null,
        ?string $feedback = null
    ): QuizAttempt {
        return QuizAttempt::create([
            'assignment_id' => $this->assignment->id,
            'quiz_id' => $this->assignment->quiz_id,
            'student_id' => $student->id,
            'attempt_number' => 1,
            'score' => $score,
            'teacher_score' => $teacherScore,
            'teacher_feedback' => $feedback,
            'total' => $total,
            'answers_data' => ['answers' => []],
            'completed_at' => now(),
        ]);
    }

    /** @return string[][] */
    private function csvRows(string $csv): array
    {
        $lines = array_values(array_filter(explode("\n", trim($csv))));
        $lines[0] = ltrim($lines[0], "\xEF\xBB\xBF");

        return array_map('str_getcsv', $lines);
    }

    private function user(string $role, array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role_id' => Role::where('title', $role)->first()->id,
        ], $attributes));
    }
}
