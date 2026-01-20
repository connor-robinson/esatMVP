# Quick Deploy Checklist

## Before You Start
- [ ] Review app builds locally (`npm run build` succeeds)
- [ ] Have Supabase credentials ready (URL and anon key)
- [ ] Have a GitHub account

## Deployment Steps

### 1. GitHub Setup (5 minutes)
```bash
cd review-app
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

### 2. Vercel Setup (5 minutes)
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. **IMPORTANT:** Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your Supabase anon key)
5. Click "Deploy"

### 3. Verify (2 minutes)
1. Visit the deployment URL
2. Test that questions load
3. Check Vercel logs for any errors

## That's It! 🎉

Your review app is now live and will auto-deploy on every git push.

