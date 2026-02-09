# Deployment Guide: Staging vs Production

This guide explains how to manage staging and production environments with Vercel.

## Overview

- **Production**: Public-facing version (your main domain)
- **Staging/Preview**: Testing version with experimental features (preview URLs)

## Setup Strategy

### Option 1: Feature Flags (Recommended)

Use environment variables to control feature visibility.

#### In Vercel Dashboard:

1. **Production Environment** (your main domain):
   - Go to Project Settings → Environment Variables
   - **DO NOT** set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION`
   - Or set it to `false`
   - Result: Question generation features are **hidden**

2. **Preview Environment** (automatic for branches):
   - Go to Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION` = `true`
   - Select: **Preview** environment
   - Result: Question generation features are **visible** on preview URLs

#### How It Works:

- Features check `isQuestionGenerationEnabled()` before rendering
- Production: Feature flag is false → Features hidden
- Preview/Staging: Feature flag is true → Features visible

### Option 2: Separate Vercel Projects

Create two separate Vercel projects:

1. **Production Project** (your main domain)
   - Connected to `main` branch
   - No feature flags enabled
   - Public-facing

2. **Staging Project** (staging.yourdomain.com or separate Vercel URL)
   - Connected to `develop` or `staging` branch
   - Feature flags enabled
   - For testing

## Current Feature Flags

- `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION`: Controls question generation UI
  - When `true`: Shows "Questions" nav link and generation features
  - When `false` or unset: Hides these features

## Vercel Preview Deployments

Vercel automatically creates preview URLs for:
- Pull requests
- Feature branches
- Any branch pushed to GitHub

**How to use:**
1. Create a feature branch: `git checkout -b feature/question-generation`
2. Push to GitHub: `git push origin feature/question-generation`
3. Vercel automatically creates a preview URL
4. Set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=true` for Preview environment
5. Test on the preview URL
6. When ready, merge to `main` (production won't have the feature flag)

## Workflow Example

### Testing New Features:

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-question-feature
   ```

2. **Develop and commit:**
   ```bash
   git add .
   git commit -m "Add new question feature"
   git push origin feature/new-question-feature
   ```

3. **Vercel creates preview URL automatically**
   - Example: `your-project-git-feature-branch.vercel.app`

4. **Set feature flag in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=true`
   - Select **Preview** environment
   - Redeploy

5. **Test on preview URL:**
   - All experimental features visible
   - Test thoroughly

6. **When ready for production:**
   - Merge to `main` branch
   - Production automatically deploys
   - Feature flag is NOT set in production → Features hidden
   - When you're ready to release, set the flag in Production environment

### Releasing to Production:

1. **Test thoroughly on preview**
2. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/new-question-feature
   git push origin main
   ```

3. **Production deploys automatically** (features still hidden)

4. **When ready to release:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=true`
   - Select **Production** environment
   - Redeploy

## Environment Variables Reference

### Required for All Environments:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (for question generation)

### Optional Feature Flags:
- `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION` (default: false)
  - Set to `true` to enable question generation UI
  - Recommended: Only enable in Preview/Staging

### For Python Scripts (Server-side):
- `SUPABASE_URL` (same as NEXT_PUBLIC_SUPABASE_URL)
- `SUPABASE_SERVICE_ROLE_KEY` (for database writes)

## Best Practices

1. **Always test on preview first** before merging to main
2. **Use feature flags** to control feature visibility
3. **Keep production clean** - only enable features when ready
4. **Document new feature flags** in this file
5. **Use descriptive branch names** for preview deployments

## Checking Current Environment

In your code, you can check:
```typescript
import { isQuestionGenerationEnabled, isPreviewEnvironment, isProduction } from "@/lib/features";

// Check if feature is enabled
if (isQuestionGenerationEnabled()) {
  // Show feature
}

// Check environment type
if (isPreviewEnvironment()) {
  // Preview/staging specific code
}

if (isProduction()) {
  // Production specific code
}
```

## Troubleshooting

**Feature not showing in preview:**
- Check that `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=true` is set for Preview environment
- Redeploy the preview deployment
- Check browser console for errors

**Feature showing in production when it shouldn't:**
- Check that `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION` is NOT set in Production environment
- Or explicitly set it to `false`
- Redeploy production

**Preview URL not working:**
- Check that the branch is pushed to GitHub
- Check Vercel dashboard for deployment status
- Ensure Vercel is connected to your GitHub repo


