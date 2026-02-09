# Quick Deployment Setup Guide

## For Staging/Testing (Preview Deployments)

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION` = `true`
   - Select: **Preview** environment
   - Save

2. **Push a branch to GitHub:**
   - Vercel automatically creates a preview URL
   - Example: `your-project-git-feature-branch.vercel.app`

3. **Test on preview URL:**
   - Question generation features will be visible
   - "Questions" link appears in navbar

## For Production (Main Domain)

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - **DO NOT** set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION`
   - Or explicitly set it to `false` for Production
   - Save

2. **Result:**
   - Question generation features are **hidden** from public
   - "Questions" link does not appear in navbar
   - Production stays clean

## When Ready to Release

1. Test thoroughly on preview
2. Merge to `main` branch
3. In Vercel, set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=true` for **Production**
4. Redeploy

That's it! 🎉


