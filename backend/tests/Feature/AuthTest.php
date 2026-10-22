<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_user_can_register()
    {
        $response = $this->postJson('/api/v1/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'student',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['user', 'token']);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_can_login()
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/v1/login', [
            'login' => $user->email,
            'password' => 'password',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token']);
    }

    public function test_login_is_rate_limited_after_repeated_failures(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/login', [
                'login' => $user->email,
                'password' => 'wrong-password',
                'device_name' => 'test-device',
            ])->assertStatus(422);
        }

        // Even the right password is refused once the account is locked out.
        $this->postJson('/api/v1/login', [
            'login' => $user->email,
            'password' => 'password',
            'device_name' => 'test-device',
        ])->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    public function test_password_reset_does_not_reveal_whether_an_email_exists(): void
    {
        $user = User::factory()->create();

        $known = $this->postJson('/api/v1/forgot-password', ['email' => $user->email]);
        $unknown = $this->postJson('/api/v1/forgot-password', ['email' => 'nobody@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());
    }

    public function test_registration_is_rate_limited(): void
    {
        for ($index = 1; $index <= 10; $index++) {
            $this->postJson('/api/v1/register', [
                'first_name' => 'Test',
                'last_name' => 'User',
                'username' => 'testuser'.$index,
                'email' => 'test'.$index.'@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
                'role' => 'student',
            ])->assertStatus(201);
        }

        $this->postJson('/api/v1/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'username' => 'testuser11',
            'email' => 'test11@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'student',
        ])->assertStatus(429);
    }

    public function test_public_registration_cannot_create_a_teacher(): void
    {
        $response = $this->postJson('/api/v1/register', [
            'first_name' => 'Fake',
            'last_name' => 'Teacher',
            'username' => 'faketeacher',
            'email' => 'fake.teacher@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'teacher',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('role');
        $this->assertDatabaseMissing('users', ['email' => 'fake.teacher@example.com']);
    }

    public function test_role_list_only_offers_registerable_roles(): void
    {
        $titles = collect($this->getJson('/api/v1/roles')->assertOk()->json())
            ->pluck('title');

        $this->assertEqualsCanonicalizing(['student', 'individual'], $titles->all());
    }

    public function test_user_can_logout()
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/logout');

        $response->assertStatus(204);
        $this->assertCount(0, $user->tokens);
    }
}
