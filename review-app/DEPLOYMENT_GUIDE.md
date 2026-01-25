# Deployment Guide: Review App to Vercel

This guide walks you through deploying the review-app as a separate Vercel project.

## Prerequisites

- A GitHub account
- A Vercel account (sign up at https://vercel.com if needed)
- Access to your Supabase project credentials

## Step 1: Prepare the Review App

### 1.1 Verify the app builds locally

```bash
cd review-app
npm install
npm run build
```

If the build succeeds, you're ready to proceed.

### 1.2 Create a .gitignore (if not already present)

The `.gitignore` should already exist, but verify it includes:
- `.next/`
- `node_modules/`
- `.env*.local`
- `.env`

## Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)

```bash
cd review-app
git init
```

### 2.2 Create a new GitHub repository

1. Go to https://github.com/new
2. Repository name: `question-review-app` (or any name you prefer)
3. Description: "Question review website for AI-generated questions"
4. Choose **Public** or **Private** (your choice)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 2.3 Push the code to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: Question review app"

# Add the remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** If you want to keep it in the same repo but separate directory, you can:
- Push the entire `review-app/` folder to a new branch, or
- Create a separate repository just for the review app (recommended for independent deployment)

## Step 3: Get Supabase Credentials

You'll need these from your Supabase project:

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (this is `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

Keep these handy for the next step.

## Step 4: Create Vercel Project

### 4.1 Import Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. If this is your first time, you may need to:
   - Click **"Configure GitHub App"** or **"Install GitHub Integration"**
   - Authorize Vercel to access your GitHub repositories
5. Find and select your repository (the one you just created)
6. Click **"Import"**

### 4.2 Configure Project Settings

1. **Project Name**: `question-review-app` (or your preferred name)
2. **Root Directory**: Leave as **"."** (since the repo is just the review-app)
   - **OR** if you put it in a subdirectory, set it to `review-app`
3. **Framework Preset**: Should auto-detect as **Next.js**
4. **Build Command**: `npm run build` (should be auto-filled)
5. **Output Directory**: `.next` (should be auto-filled)
6. **Install Command**: `npm install` (should be auto-filled)

### 4.3 Set Environment Variables

**IMPORTANT:** Before deploying, you MUST add environment variables:

1. In the project configuration page, scroll down to **"Environment Variables"**
2. Click **"Add"** and add these two variables:

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: (paste your Supabase Project URL)
   - **Environments**: Check all (Production, Preview, Development)

   **Variable 2:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: (paste your Supabase anon/public key)
   - **Environments**: Check all (Production, Preview, Development)

3. Click **"Save"** after adding each variable

### 4.4 Deploy

1. Click **"Deploy"** button at the bottom
2. Wait for the build to complete (usually 1-3 minutes)
3. Once deployed, you'll see:
   - ✅ Build successful
   - A URL like: `https://question-review-app.vercel.app`

## Step 5: Verify Deployment

### 5.1 Test the Deployment

1. Click on the deployment URL
2. You should see the review interface
3. Try accessing the analytics panel
4. Verify that questions load (if you have pending questions in the database)

### 5.2 Check for Errors

1. In Vercel dashboard, go to your project
2. Click on the deployment
3. Check the **"Logs"** tab for any errors
4. Check the **"Functions"** tab to see if API routes are working

## Step 6: Custom Domain (Optional)

If you want a custom domain:

1. In Vercel project settings, go to **"Domains"**
2. Add your domain (e.g., `review.yourdomain.com`)
3. Follow Vercel's DNS configuration instructions
4. Wait for DNS propagation (can take up to 24 hours)

## Step 7: Set Up Automatic Deployments

Vercel automatically:
- ✅ Deploys on every push to `main` branch (production)
- ✅ Creates preview deployments for pull requests
- ✅ Rebuilds on every commit

You can configure this in **Settings** → **Git** if needed.

## Troubleshooting

### Build Fails

1. Check the build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables → Add them in Vercel project settings
   - TypeScript errors → Fix locally and push again
   - Missing dependencies → Check `package.json`

### Environment Variables Not Working

1. Make sure variables are prefixed with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding new environment variables
3. Check that variables are enabled for the correct environments

### Database Connection Issues

1. Verify Supabase URL and key are correct
2. Check Supabase project is active (not paused)
3. Verify Row Level Security (RLS) policies allow access
4. Check Supabase logs for connection errors

### Questions Not Loading

1. Verify you have questions with `status = 'pending_review'` in the database
2. Check browser console for errors
3. Check Vercel function logs for API errors
4. Verify Supabase RLS policies allow reading from `ai_generated_questions` table

## Updating the App

To update the app after making changes:

```bash
cd review-app
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel will automatically detect the push and deploy a new version.

## Useful Vercel Features

- **Preview Deployments**: Every PR gets its own preview URL
- **Analytics**: View performance metrics in the dashboard
- **Logs**: Real-time function logs for debugging
- **Environment Variables**: Different values for production/preview/development
- **Rollback**: Easily rollback to previous deployments

## Security Notes

- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (it's public by design)
- Make sure your Supabase RLS policies are properly configured
- Consider adding authentication if you want to restrict access to reviewers only

## Next Steps

1. Share the Vercel URL with your reviewers
2. Set up authentication (optional) if needed
3. Monitor usage through Vercel analytics
4. Set up error tracking (e.g., Sentry) if desired

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs




