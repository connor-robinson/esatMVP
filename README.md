# No-Calc Trainer MVP

This is a streamlined MVP version of the No-Calc Trainer application, focusing on core practice and assessment features.

## Included Sections

### Overview (`/`)
- Homepage with activity calendar
- Quick navigation to key sections
- Activity heatmap showing practice history

### Papers (`/papers/*`)
- **Library** (`/papers/library`): Paper session setup wizard
- **Solve** (`/papers/solve`): Timed paper-taking interface
- **Mark** (`/papers/mark`): Review and marking interface
- **Analytics** (`/papers/analytics`): Performance analytics (placeholder for now)
- **Drill** (`/papers/drill`): Spaced repetition drill mode for paper questions

### Train (`/train/*`)
- **Drill** (`/train/drill`): Custom multi-topic session builder
- **Analytics** (`/train/analytics`): Performance analytics with Personal/Global views

## Excluded Sections

The following sections are **intentionally excluded** from this MVP:

- **Learn** (`/train/learn`): Topic tutorials and lessons
- **Interview** (`/interview/*`): Interview preparation features

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase project with database configured

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx          # Overview homepage
│   ├── papers/           # Papers section pages
│   └── train/            # Train section pages
├── components/            # React components
│   ├── analytics/        # Analytics components
│   ├── builder/          # Session builder components
│   ├── home/             # Homepage components
│   ├── papers/           # Papers-specific components
│   └── shared/           # Shared components
├── lib/                  # Utility libraries
│   ├── analytics.ts     # Analytics calculations
│   ├── papers/          # Papers utilities
│   └── supabase/        # Supabase clients and queries
├── store/                # Zustand state stores
├── types/                # TypeScript type definitions
└── config/               # Configuration files
```

## Key Features

- **Paper Practice**: Full paper-taking workflow from planning to marking
- **Drill Sessions**: Custom multi-topic practice sessions
- **Analytics**: Performance tracking and insights
- **Activity Tracking**: Visual calendar showing practice history
- **Spaced Repetition**: Drill mode for reviewing difficult questions

## Notes

- The Papers Analytics page is currently a placeholder with mock data
- All Learn and Interview routes have been removed
- Navigation has been simplified to only show Overview, Papers, and Train sections


