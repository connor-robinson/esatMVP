# API Key Security Guide

## Why Your API Key Was Reported as Leaked

Google's AI Studio monitors API keys for security. Your key was flagged as "leaked" if it was:

1. **Committed to Git** - Even if you removed it later, it's still in Git history
2. **Shared publicly** - Posted in forums, GitHub issues, screenshots, etc.
3. **Exposed in logs** - Printed in console output that was shared
4. **Detected in public repos** - Google scans public repositories for exposed keys

## Immediate Steps to Fix

### 1. Generate a New API Key

1. Go to [Google AI Studio API Keys](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select your project (or create a new one)
5. **Copy the new key immediately** - you won't be able to see it again!

### 2. Update Your .env.local File

Open `.env.local` in your project root and replace the old key:

```bash
# Old (REVOKED - DO NOT USE)
GEMINI_API_KEY=AIzaSyCNhRb0Aj3yVcqglvc9i_OrlBbpmXDl2pU

# New (replace with your new key)
GEMINI_API_KEY=your_new_api_key_here
```

### 3. Verify the New Key Works

Run the test script:
```bash
cd scripts\esat_question_generator
python test_api_key.py
```

You should see: `✓ SUCCESS! Response: test successful`

### 4. Restart Your Next.js Server

After updating `.env.local`, restart your dev server:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Security Best Practices

### ✅ DO:
- ✅ Keep `.env.local` in `.gitignore` (already done)
- ✅ Never commit API keys to Git
- ✅ Use different keys for development and production
- ✅ Rotate keys periodically
- ✅ Use environment variables, not hardcoded values
- ✅ Restrict API key permissions in Google Cloud Console

### ❌ DON'T:
- ❌ Commit `.env.local` to Git
- ❌ Share API keys in chat, email, or forums
- ❌ Include keys in screenshots or videos
- ❌ Hardcode keys in source code
- ❌ Use the same key for multiple projects
- ❌ Leave keys in public repositories

## Checking if Your Key is Exposed

### Check Git History
```bash
# Search Git history for your old API key
git log --all --full-history -S "AIzaSyCNhRb0Aj3yVcqglvc9i_OrlBbpmXDl2pU"
```

If found, you need to:
1. Remove it from Git history (advanced - requires force push)
2. Or create a new repository without the history

### Check Public Repositories
- Search GitHub for your API key
- Check if any forks or public repos contain it
- Review any shared code snippets

## If Your Key is in Git History

If your key was committed to Git (even if removed later), it's still in the history:

1. **For local repos**: The key is in your local history but not exposed if the repo is private
2. **For public repos**: The key is permanently exposed and must be rotated
3. **Solution**: Generate a new key and ensure `.env.local` is in `.gitignore`

## Testing Your New Key

After updating your `.env.local`:

1. **Test with Python script:**
   ```bash
   cd scripts\esat_question_generator
   python test_api_key.py
   ```

2. **Test via web interface:**
   - Go to http://localhost:3000/questions/review
   - Click "Generate 10 Questions"
   - Check the server console for success messages

## Need Help?

If you continue to have issues:
1. Verify the new API key is correct (no extra spaces, quotes, etc.)
2. Check that `.env.local` is in the project root (not in a subdirectory)
3. Ensure you restarted the Next.js server after updating
4. Check server console logs for detailed error messages


