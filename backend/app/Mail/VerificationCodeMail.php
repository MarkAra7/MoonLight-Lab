<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify Your Email',
        );
    }

    public function content(): Content
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        $expireMinutes = config('app.verification.expire', 15);

        return new Content(
            html: 'emails.verification-code',
            with: [
                'url' => $frontendUrl . '/verify-email?token=' . $this->token,
                'expireMinutes' => $expireMinutes,
            ],
        );
    }
}
