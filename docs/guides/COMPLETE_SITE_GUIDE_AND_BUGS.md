Complete Site Guide & Bug List

This document explains every main part of the NoCalc application and lists all bugs that need fixing or human review.


Part 1: Understanding the Site

NoCalc is a practice platform for entrance exams (ESAT, TMUA, NSAA, ENGAA). The site has three main features:
Practice mental math skills + analytics
Practice past papers + review detailed analytics for those sessions
Practice questions from question bank + some analytics

The app is built with Next.js 14, TypeScript, Supabase (database), and Zustand (state management).
Main Sections of the Site

1. Homepage (`/`)

The landing page that visitors see first.

**Key features:**
- Hero section with email signup (currently not functional - see bugs)
- Three main feature cards: Mental Maths Trainer, Past Papers, Question Bank
- Pricing section (not connected to payment system)
- FAQ section
- Footer with links

**How it works:**
- Static marketing page
- Links to main features
- Email form exists but doesn't actually submit anywhere (TODO comment in code)

**Files:**
- `src/app/page.tsx` - Main homepage component


2. Past Papers Section (`/past-papers/*`)

Main page 2 where students practice past papers

2.1 Paper Library (`/past-papers/library`)

Library: Where students browse and select papers to practice.

How it works:
From supabase, it retrieves all available papers organised by exam type.
Students can add specific parts to the “session folder”
Students can start a session when they are ready.
Sessions are saved to the database so students can resume later

Files:
- `src/app/past-papers/library/page.tsx` - Library page
- `src/store/paperSessionStore.ts` - State management for paper sessions

---

2.2 Paper Solving (`/past-papers/solve`)

The actual exam-taking interface where students answer questions.

Displays questions one at a time (based on what was selected in the sections)
Can mark questions as guessed or for review. Will show up in analytics
Progress is autosaved every few seconds
Can pause and resume.

**State management:**
- Currently uses Zustand store (`paperSessionStore`) to track:
  - Current question index
  - Answers for each question
  - Time spent per question
  - Guessed flags
  - Review flags
  - Session metadata

**Files:**
- `src/app/past-papers/solve/page.tsx` - Main solving interface
- `src/components/papers/QuestionDisplay.tsx` - Question display component
- `src/components/papers/TimerDisplay.tsx` - Timer component
- `src/components/papers/QuestionGrid.tsx` - Grid view of all questions

**Complex parts:**
- Section-based timing (each section has its own deadline)
- Session persistence (saves to database automatically)
- Resume functionality (can continue paused sessions)
- Image prefetching (loads next questions in background)
2.3 Paper Marking (`/past-papers/mark`)

After completing a paper, students review their answers here.

**How it works:**
- Shows all questions with correct answers highlighted
- Students can mark each question as correct/incorrect
- Can tag mistakes (e.g., "Calculation error", "Misread question")
- Shows time spent per question

**Key features:**
- **Left sidebar:** List of all questions with status indicators
- **Right panel:** Current question with image, answer choices, solution
- **Analytics:** Section-by-section breakdown, percentile calculations
- **Mistake tracking:** Visual charts showing mistake patterns
- **Time analysis:** Scatter plot showing time vs. correctness
- **Conversion tables:** For ENGAA/NSAA/TMUA, shows raw score → converted score → percentile

**Complex calculations:**
- Percentile calculation using conversion tables
- Section performance aggregation
- ESAT table interpolation (complex percentile lookup)
- NSAA multi-subject averaging

**Files:**
- `src/app/past-papers/mark/page.tsx` - **This is a HUGE file (3000+ lines)** - the marking interface
- `src/components/papers/MistakeChart.tsx` - Mistake visualization
- `src/components/papers/TimeScatterChart.tsx` - Time analysis chart
- `src/lib/esat/percentiles.ts` - ESAT percentile calculations
- `src/lib/supabase/questions.ts` - Conversion table utilities

**This is the most complex page in the app.**

---

2.4 Paper Analytics (`/past-papers/analytics`)

Overview of all paper performance across multiple sessions.

- Shows performance trends over time
- Aggregates data from all completed papers
- Filters by paper type, section, time range

**Files:**
- `src/app/past-papers/analytics/page.tsx` - Analytics page
- `src/lib/papers/analytics.ts` - Analytics calculation functions
- `src/components/papers/AnalyticsTrendChart.tsx` - Trend visualization

2.5 Paper Drill (`/past-papers/drill`)

**What it is:** Spaced repetition practice for questions from papers.

**How it works:**
- Students can add questions from marked papers to their drill
- Uses spaced repetition algorithm to show questions at optimal intervals
- Focuses on questions they got wrong or want to review
- UI not very good right now

**Files:**
- `src/app/past-papers/drill/page.tsx` - Drill interface

2.6 Paper Roadmap (`/past-papers/roadmap`)

**What it is:** A structured, unlock-based roadmap that turns all past papers into a guided study plan (Math 1 / Math 2 / Physics tracks), instead of students just randomly picking papers.

**How it works:**
- Roadmap stages (e.g. Foundation/Core/Advanced) are defined in `roadmapConfig` and grouped by exam + year.
- Each stage is made up of **parts** (e.g. "NSAA 2019 – Section 1 – Part A Mathematics") that correspond to real parts in the database.
- Under the hood, when you start a roadmap stage, the app:
  - Looks up the correct **paper(s)** from the Supabase `papers` table using `getPaper` in `src/lib/supabase/questions.ts`.
  - Loads the **real past paper questions** from the Supabase `questions` table using `getQuestions(paperId)` (this function explicitly does **not** touch `ai_generated_questions`).
  - Filters those questions in memory based on the roadmap part definition:
    - `exam_name` (NSAA / ENGAA / TMUA),
    - `paper_name` (Section 1 / Section 2 / Paper 1 / Paper 2),
    - `part_letter` (Part A / Part B / etc.),
    - `part_name` (e.g. "Mathematics", "Physics", "Advanced Mathematics and Advanced Physics"),
    - optional `questionRange` / `questionFilter` to split or cherry-pick questions for Math1/Math2/Physics.
- When a student completes a part (by finishing the underlying questions/sessions), completion is tracked in Supabase via helper utilities so the roadmap can show:
  - Progress bars per stage,
  - Which parts are done / in-progress / locked,
  - Overall completion for Math 1 / Math 2 / Physics.
- The UI has three main pieces:
  - **List view** of all roadmap stages and parts.
  - **Timeline / horizontal view** for a more visual "journey" feel.
  - **Analytics panel** summarising completion and coverage.

**Files:**
- `src/app/past-papers/roadmap/page.tsx` - Main roadmap page (fetches config, filters questions, wires up completion + UI components).
- `src/lib/papers/roadmapConfig.ts` - Roadmap stage + part definitions (what appears in the roadmap).
- `src/lib/papers/roadmapCompletion.ts` - Completion tracking helpers and aggregation.
- `src/lib/papers/sectionMapping.ts` / `src/lib/papers/partIdUtils.ts` - Maps database parts to curriculum sections and generates stable IDs for completion tracking.
- `src/components/papers/roadmap/*` - All roadmap UI components (`RoadmapList`, `RoadmapTimeline`, `StageListCard`, `StageDetailsModal`, `RoadmapAnalytics`, etc.).

**Known issues / things that need human review:**
- If **database part names or letters don’t exactly match** what `roadmapConfig` expects (e.g. "Maths" vs "Mathematics", "Part A" vs "A"), some parts may show **zero questions** even though there is data. The matching is slightly flexible but still fragile and should be reviewed carefully.
- Unlock / completion logic depends on correctly saved sessions and stable part IDs. If any of that changes (e.g. renaming parts in config), existing completion can become inconsistent and should be migrated/fixed manually.
- The roadmap UI is fairly dense and may not be fully optimised for **mobile**; layout and scrolling behaviour should be tested and improved by a human.

3. Mental Maths Section (`/mental-maths/*`)

This section is for general practice (not paper-specific).

 3.1 Mental Maths Drill (`/mental-maths/drill`)

Custom practice sessions on specific topics.

**How it works:**
- Students select topics (e.g., "Fractions", "Algebra", "Trigonometry")
- Creates a custom session with questions from those topics
- Similar to paper solving but without the paper structure

**Files:**
- `src/app/mental-maths/drill/page.tsx` - Mental Maths drill page
- `src/components/builder/TopicSelector.tsx` - Topic selection UI

---

 3.2 Mental Maths Analytics (`/mental-maths/analytics`)

**What it is:** Performance analytics for skills practice.

**How it works:**
- Shows performance by topic
- Tracks improvement over time
- Personal vs. global performance comparison

**Files:**
- `src/app/mental-maths/analytics/page.tsx` - Mental Maths analytics

---

 4. Question Bank (`/questions/*`)

 4.1 Question Bank (`/questions/questionbank`)

**What it is:** Browse and practice from a large database of questions.

**How it works:**
- Shows all available questions
- Can filter by topic, difficulty, exam type
- Can practice questions individually
- Tracks progress through the question bank

**Files:**
- `src/app/questions/questionbank/page.tsx` - Question bank interface

---

 4.2 Question Library (`/questions/library`)

**What it is:** Another view of the question database with different organization.

**Files:**
- `src/app/questions/library/page.tsx`

---

 5. Mental Math Trainer

**What it is:** Specialized practice for mental arithmetic (no calculator allowed).

**How it works:**
- Generates arithmetic problems
- Students type answers
- Tracks speed and accuracy
- Focuses on skills needed for non-calculator exams

**Files:**
- `src/components/mental-math/MentalMathSession.tsx` - Main trainer component
- `src/lib/generators/` - Question generators (addition, multiplication, etc.)

---

 6. Authentication & Profile

 Login (`/login`)

**What it is:** User authentication page.

**How it works:**
- Uses Supabase Auth
- Email/password login
- OAuth options (if configured)

**Files:**
- `src/app/login/page.tsx` - Login page
- `src/components/auth/` - Auth components

---

 Profile (`/profile`)

**What it is:** User account management.

**How it works:**
- View/edit profile information
- Change password
- Export data
- Delete account

**Files:**
- `src/app/profile/page.tsx` - Profile page
- `src/app/api/profile/` - Profile API routes

---
