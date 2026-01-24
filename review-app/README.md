# Question Review App

A standalone review website for external reviewers to review, edit, and approve AI-generated questions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Two-column layout**: Question and options on the left, solution on the right
- **Edit mode**: Convert all text fields to editable textareas
- **Approve functionality**: Mark questions as approved and automatically move to next
- **Analytics panel**: Filter by paper type and subject, view progress statistics
- **Auto-advance**: Automatically loads next pending question after approval

## Deployment

This app can be deployed independently to Vercel:

1. Push the `review-app/` directory to GitHub
2. Import the project in Vercel
3. Set the same environment variables as in `.env.local`
4. Deploy

## Structure

- `src/app/page.tsx` - Main review interface
- `src/components/` - React components
- `src/hooks/` - Custom hooks for state management
- `src/app/api/review/` - API routes for fetching and updating questions


