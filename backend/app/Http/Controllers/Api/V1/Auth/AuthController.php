<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Mail\VerificationCodeMail;
use App\Models\EmailVerification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $role = Role::where('title', $request->role)->firstOrFail();

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'username' => $request->username,
            'email' => $request->email,
            'country' => $request->country,
            'preferred_language' => $request->preferred_language ?? 'en',
            'password' => Hash::make($request->password),
            'role_id' => $role->id,
        ]);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('registration')->plainTextToken,
        ], 201);
    }

    public function verify(Request $request)
    {
        $request->validate(['token' => ['required', 'string', 'uuid']]);

        $user = $request->user();

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $verification = EmailVerification::where('id', $request->token)
            ->where('user_id', $user->id)
            ->first();

        if (! $verification) {
            throw ValidationException::withMessages([
                'token' => ['The verification link is invalid.'],
            ]);
        }

        if (! $verification->isValid()) {
            throw ValidationException::withMessages([
                'token' => ['The verification link has expired. Request a new one.'],
            ]);
        }

        $user->update(['email_verified_at' => now()]);

        $verification->delete();

        return response()->json(['message' => 'Email verified successfully.']);
    }

    public function resendVerification(Request $request)
    {
        $user = $request->user();

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $verification = EmailVerification::generateFor($user);

        Mail::to($user)->send(new VerificationCodeMail($user, $verification->id));

        return response()->json(['message' => 'Verification email sent.']);
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->login)
            ->orWhere('username', $request->login)
            ->first();

            print_r($user); 
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->load('role');

        return response()->json([
            'user' => $user,
            'token' => $user->createToken($request->device_name)->plainTextToken,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 400);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 400);
        }

        return response()->json(['message' => __($status)]);
    }
}
