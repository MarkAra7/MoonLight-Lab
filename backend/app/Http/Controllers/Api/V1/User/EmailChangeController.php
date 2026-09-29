<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Mail\EmailChangeMail;
use App\Models\EmailChangeRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmailChangeController extends Controller
{
    public function show(Request $request)
    {
        $change = EmailChangeRequest::where('user_id', $request->user()->id)->first();

        if ($change && $change->isExpired()) {
            $change->delete();

            $change = null;
        }

        return response()->json([
            'change' => $change ? $this->state($change) : null,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $passwordValidated = $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        if (! Hash::check($passwordValidated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password is incorrect.'],
            ]);
        }

        $emailValidated = $request->validate([
            'new_email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        if ($emailValidated['new_email'] === $user->email) {
            throw ValidationException::withMessages([
                'new_email' => ['The new email must be different from your current email.'],
            ]);
        }

        $newEmailToken = Str::uuid()->toString();
        $currentEmailToken = Str::uuid()->toString();

        EmailChangeRequest::where('user_id', $user->id)->delete();

        $change = EmailChangeRequest::create([
            'user_id' => $user->id,
            'current_email' => $user->email,
            'new_email' => $emailValidated['new_email'],
            'new_email_token_hash' => hash('sha256', $newEmailToken),
            'current_email_token_hash' => hash('sha256', $currentEmailToken),
            'expires_at' => now()->addMinutes(config('verification.expire', 15)),
        ]);

        Mail::to($change->new_email)->send(new EmailChangeMail(
            $user,
            $change->new_email,
            $change->current_email,
            $newEmailToken,
            'new_email',
        ));

        Mail::to($change->current_email)->send(new EmailChangeMail(
            $user,
            $change->new_email,
            $change->current_email,
            $currentEmailToken,
            'current_email',
        ));

        return response()->json([
            'message' => 'Confirmation links sent to both email addresses.',
            'change' => $this->state($change),
        ], 201);
    }

    public function verifyNewEmail(Request $request)
    {
        $validated = $request->validate(['token' => ['required', 'string', 'uuid']]);

        $change = $this->authorizeToken($request, 'new_email', $validated['token']);

        if (! $change->new_email_verified_at) {
            $change->forceFill(['new_email_verified_at' => now()])->save();
        }

        return $this->respondAfterVerification(
            $request->user(),
            $change->refresh(),
            'New email address confirmed.'
        );
    }

    public function verifyCurrentEmail(Request $request)
    {
        $validated = $request->validate(['token' => ['required', 'string', 'uuid']]);

        $change = $this->authorizeToken($request, 'current_email', $validated['token']);

        if (! $change->current_email_verified_at) {
            $change->forceFill(['current_email_verified_at' => now()])->save();
        }

        return $this->respondAfterVerification(
            $request->user(),
            $change->refresh(),
            'Current email address confirmed.'
        );
    }

    /**
     * Complete the change only once BOTH addresses are confirmed, otherwise hand
     * back the outstanding step. Mail clients deliver two links in no guaranteed
     * order, so either verification may legitimately be the second one clicked.
     */
    private function respondAfterVerification($user, EmailChangeRequest $change, string $confirmed)
    {
        if ($change->new_email_verified_at && $change->current_email_verified_at) {
            DB::transaction(function () use ($change, $user) {
                $user->forceFill([
                    'email' => $change->new_email,
                    'email_verified_at' => now(),
                ])->save();

                $change->delete();
            });

            return response()->json([
                'message' => 'Email address changed successfully.',
                'change' => null,
                'user' => UserResource::make($user->load(['role', 'avatar'])),
            ]);
        }

        $outstanding = $change->new_email_verified_at ? 'current address' : 'new address';

        return response()->json([
            'message' => "{$confirmed} Confirm the {$outstanding} to finish the change.",
            'change' => $this->state($change),
            'user' => UserResource::make($user->load(['role', 'avatar'])),
        ]);
    }

    public function cancel(Request $request)
    {
        EmailChangeRequest::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Email change cancelled.']);
    }

    private function authorizeToken(Request $request, string $step, string $token): EmailChangeRequest
    {
        $change = EmailChangeRequest::where('user_id', $request->user()->id)->first();

        $expected = match ($step) {
            'new_email' => $change?->new_email_token_hash,
            'current_email' => $change?->current_email_token_hash,
        };

        if (! $expected || ! hash_equals($expected, hash('sha256', $token))) {
            throw ValidationException::withMessages([
                'token' => ['This confirmation link is invalid.'],
            ]);
        }

        if ($change->isExpired()) {
            throw ValidationException::withMessages([
                'token' => ['This confirmation link has expired. Request a new one.'],
            ]);
        }

        return $change;
    }

    private function state(EmailChangeRequest $change): array
    {
        return [
            'id' => $change->id,
            'new_email' => $change->new_email,
            'current_email' => $change->current_email,
            'new_email_verified_at' => $change->new_email_verified_at?->toIso8601String(),
            'current_email_verified_at' => $change->current_email_verified_at?->toIso8601String(),
            'expires_at' => $change->expires_at->toIso8601String(),
            'completed_at' => null,
        ];
    }
}
