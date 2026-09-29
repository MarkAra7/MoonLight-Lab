<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email Change</title>
    <style>
        body { margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 480px; margin: 40px auto; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 48px 40px; }
        .logo { width: 48px; height: 48px; background: rgba(56,189,248,0.1); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .logo span { font-size: 20px; color: #38bdf8; font-weight: 900; }
        h1 { font-size: 24px; font-weight: 800; color: #ffffff; text-align: center; margin: 0 0 8px; }
        p { font-size: 15px; color: #94a3b8; text-align: center; line-height: 1.6; margin: 0 0 32px; }
        .btn { display: block; width: fit-content; margin: 0 auto; padding: 14px 32px; background-color: #38bdf8; color: #0f172a; font-weight: 700; font-size: 15px; border-radius: 10px; text-decoration: none; text-align: center; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
        .footer p { font-size: 13px; color: #64748b; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><span>MQ</span></div>
        @if ($step === 'new_email')
            <h1>Confirm Your New Address</h1>
            <p>Confirm this address to finish adding {{ $newEmail }} to your account. Your email address only changes once both your current address and the new address have been confirmed.</p>
            <a href="{{ $url }}" class="btn">Confirm New Email</a>
        @else
            <h1>Confirm Your Email Change</h1>
            <p>Confirm this address to move your account from {{ $currentEmail }} to {{ $newEmail }}. If you did not request this change, do not confirm and secure your account.</p>
            <a href="{{ $url }}" class="btn">Confirm Change</a>
        @endif
        <div class="footer">
            <p>This confirmation link expires in {{ $expireMinutes }} minutes.</p>
            <p style="margin-top: 8px;">If you did not request an email change, no further action is required.</p>
        </div>
    </div>
</body>
</html>
