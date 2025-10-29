# Supabase Email Templates

These are the improved email templates for Supabase authentication. Copy each template into your Supabase dashboard:

**Go to:** Authentication → Email Templates in your Supabase project dashboard

---

## 1. Confirm Signup

**Subject:** `Welcome to Sculpt Sequences!`

**HTML Template:**
```html
<h2 style="color: #030213; font-size: 24px; margin-bottom: 20px;">Welcome to Sculpt Sequences! 💪</h2>

<p style="color: #717182; font-size: 16px; line-height: 1.6;">Thanks for joining! You're one step away from building your perfect workout sequences.</p>
<p style="color: #717182; font-size: 16px; line-height: 1.6; margin-top: 16px;">Click below to confirm your email and start sculpting:</p>
<p style="margin-top: 24px;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #030213; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirm your email</a>
</p>
```

---

## 2. Magic Link

**Subject:** `Your Sculpt Sequences login`

**HTML Template:**
```html
<h2 style="color: #030213; font-size: 24px; margin-bottom: 20px;">Your Sculpt Sequences login 🔐</h2>

<p style="color: #717182; font-size: 16px; line-height: 1.6;">Click below to securely access your sequence library:</p>
<p style="margin-top: 24px;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #030213; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Log In</a>
</p>
```

---

## 3. Change Email Address

**Subject:** `Update your Sculpt Sequences email`

**HTML Template:**
```html
<h2 style="color: #030213; font-size: 24px; margin-bottom: 20px;">Update your Sculpt Sequences email ✉️</h2>

<p style="color: #717182; font-size: 16px; line-height: 1.6;">You requested to change your email from {{ .Email }} to {{ .NewEmail }}.</p>
<p style="color: #717182; font-size: 16px; line-height: 1.6; margin-top: 16px;">Click below to confirm this change:</p>
<p style="margin-top: 24px;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #030213; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirm Email Change</a>
</p>
```

---

## 4. Reset Password

**Subject:** `Reset your Sculpt Sequences password`

**HTML Template:**
```html
<h2 style="color: #030213; font-size: 24px; margin-bottom: 20px;">Reset your Sculpt Sequences password 🔒</h2>

<p style="color: #717182; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click below to create a new one and get back to building your sequences:</p>
<p style="margin-top: 24px;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #030213; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
</p>
```

---

## 5. Invite User

**Subject:** `You've been invited to Sculpt Sequences! 🎉`

**HTML Template:**
```html
<h2 style="color: #030213; font-size: 24px; margin-bottom: 20px;">You've been invited to Sculpt Sequences! 🎉</h2>

<p style="color: #717182; font-size: 16px; line-height: 1.6;">You've been invited to join Sculpt Sequences and start building your perfect workout sequences.</p>
<p style="color: #717182; font-size: 16px; line-height: 1.6; margin-top: 16px;">Click below to accept your invitation:</p>
<p style="margin-top: 24px;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #030213; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invite</a>
</p>
```

---

## Available Variables

Supabase provides these variables you can use in templates:

- `{{ .SiteURL }}` - Your site's URL
- `{{ .ConfirmationURL }}` - The confirmation/action link
- `{{ .Token }}` - The confirmation token (if needed)
- `{{ .Email }}` - The user's email address
- `{{ .NewEmail }}` - The new email address (for email change)
- `{{ .RedirectTo }}` - The redirect URL after confirmation

---

## Notes

- These templates use your site's brand colors: Primary (`#030213`) and Muted Foreground (`#717182`)
- Make sure your `Site URL` is set correctly in Authentication → URL Configuration
- Test emails will be sent to the email address you configure in your Supabase project settings
