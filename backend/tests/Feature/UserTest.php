<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->user = User::factory()->create();
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_can_list_users()
    {
        $admin = User::factory()->create([
            'role_id' => Role::where('title', 'admin')->first()->id,
        ]);
        $this->actingAs($admin, 'sanctum');

        User::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(200);
    }

    public function test_can_show_user()
    {
        $user = User::factory()->create();

        $response = $this->getJson('/api/v1/users/'.$user->id);

        $response->assertStatus(200)
            ->assertJsonPath('email', $user->email);
    }

    public function test_can_update_user()
    {
        $response = $this->putJson('/api/v1/users/'.$this->user->id, [
            'first_name' => 'Updated',
            'last_name' => 'Name',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('first_name', 'Updated')
            ->assertJsonPath('last_name', 'Name');

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'first_name' => 'Updated',
            'last_name' => 'Name',
        ]);
    }

    public function test_cannot_update_another_user()
    {
        $otherUser = User::factory()->create();

        $response = $this->putJson('/api/v1/users/'.$otherUser->id, [
            'first_name' => 'Updated',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You do not have permission to update this user.');
    }

    public function test_can_delete_user()
    {
        $response = $this->deleteJson('/api/v1/users/'.$this->user->id);

        $response->assertStatus(204);
        $this->assertSoftDeleted('users', ['id' => $this->user->id]);
    }

    public function test_cannot_delete_another_user()
    {
        $otherUser = User::factory()->create();

        $response = $this->deleteJson('/api/v1/users/'.$otherUser->id);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You do not have permission to delete this user.');
    }

    private function admin(): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', 'admin')->first()->id,
        ]);
    }

    public function test_admin_can_search_users_by_email_or_username(): void
    {
        $this->actingAs($this->admin(), 'sanctum');

        $target = User::factory()->create([
            'username' => 'needle_user',
            'email' => 'needle@example.com',
        ]);
        User::factory()->create(['username' => 'someone_else']);

        $response = $this->getJson('/api/v1/users?q=needle')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($target->id));
        $this->assertCount(1, $ids);
    }

    public function test_non_admin_cannot_list_users(): void
    {
        $student = User::factory()->create([
            'role_id' => Role::where('title', 'student')->first()->id,
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/users')
            ->assertStatus(403);
    }

    public function test_admin_can_list_every_role(): void
    {
        $titles = collect($this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/roles')
            ->assertOk()
            ->json())
            ->pluck('title');

        $this->assertEqualsCanonicalizing(['admin', 'teacher', 'student', 'individual'], $titles->all());
    }

    public function test_non_admin_cannot_list_every_role(): void
    {
        $teacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/admin/roles')
            ->assertStatus(403);
    }

    public function test_admin_can_change_another_users_role(): void
    {
        $this->actingAs($this->admin(), 'sanctum');

        $student = User::factory()->create([
            'role_id' => Role::where('title', 'student')->first()->id,
        ]);
        $teacherRole = Role::where('title', 'teacher')->first();

        $this->patchJson('/api/v1/users/'.$student->id.'/role', ['role_id' => $teacherRole->id])
            ->assertOk()
            ->assertJsonPath('role.title', 'teacher');

        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'role_id' => $teacherRole->id,
        ]);
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum');

        $this->patchJson('/api/v1/users/'.$admin->id.'/role', [
            'role_id' => Role::where('title', 'student')->first()->id,
        ])->assertStatus(403);
    }

    public function test_non_admin_cannot_change_roles(): void
    {
        $teacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);
        $this->actingAs($teacher, 'sanctum');

        $student = User::factory()->create([
            'role_id' => Role::where('title', 'student')->first()->id,
        ]);

        $this->patchJson('/api/v1/users/'.$student->id.'/role', ['role_id' => $teacher->role_id])
            ->assertStatus(403);
    }
}
