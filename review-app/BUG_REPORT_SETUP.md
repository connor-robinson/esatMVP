# Bug Report Email Setup

The bug report feature sends emails using the Resend API. Here's how to set it up:

## Quick Setup (5 minutes)

### 1. Sign up for Resend
- Go to https://resend.com
- Sign up for a free account (100 emails/day free tier)
- Verify your email

### 2. Get your API Key
- Go to https://resend.com/api-keys
- Click "Create API Key"
- Copy the API key (starts with `re_`)

### 3. Configure Environment Variables
Add these to your `review-app/.env.local` file:

```env
RESEND_API_KEY=re_your_api_key_here
BUG_REPORT_EMAIL=your-email@example.com
```

### 4. Restart your dev server
```bash
npm run dev
```

## Production Setup (Vercel)

If you're deploying to Vercel, you also need to add these environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `RESEND_API_KEY` = `re_your_api_key_here`
   - `BUG_REPORT_EMAIL` = `your-email@example.com`
4. Select the environments (Production, Preview, Development) where you want these variables
5. **Redeploy** your application for the changes to take effect

**Note:** Environment variables in Vercel are separate from your local `.env.local` file. You need to add them in both places.

## How It Works

1. User clicks "Report Bug" button in the sidebar
2. Fills out the bug report form
3. Bug report is sent to your email via Resend API
4. You receive an email with all the details

## Email Content

The email includes:
- Bug description
- Question ID (if available)
- Steps to reproduce
- Additional information
- Timestamp

## Fallback Behavior

If email is not configured:
- Bug reports are logged to the console
- No errors are shown to the user
- You can check server logs for bug reports

## Alternative Email Services

You can modify `review-app/src/app/api/bug-report/route.ts` to use:
- SendGrid
- Mailgun
- AWS SES
- Nodemailer with SMTP
- Any other email service

## Testing

1. Click "Report Bug" in the sidebar
2. Fill out the form
3. Submit
4. Check your email inbox

## Troubleshooting

**Emails not sending?**
- Check that `RESEND_API_KEY` is set correctly
- Check that `BUG_REPORT_EMAIL` is set correctly
- Check server console for errors
- Verify your Resend account is active

**Want to test without email?**
- Leave the env variables unset
- Bug reports will be logged to console instead

