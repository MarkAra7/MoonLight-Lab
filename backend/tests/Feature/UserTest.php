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
}
