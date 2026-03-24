# Simple Question Generator UI

A clean, hands-off Tkinter interface for batch question generation.

## Features

- **Systematic Generation**: Works through schemas in order (M1-M7 → P1-P7 → B1-B45 → C1-C78)
- **Minimum Requirements**: Generates 5 + current_db_count questions per schema
- **Real-time Progress**: Shows completion status for each schema
- **Immediate Saves**: Saves to Supabase and local backup after each successful question
- **Simple Controls**: Just Start/Stop buttons, fully hands-off

## Usage

### Running the UI

```bash
cd scripts/esat_question_generator
python simple_generator_ui.py
```

### Prerequisites

1. **API Key**: Ensure `GEMINI_API_KEY` is set in `.env.local` (in project root)
2. **Supabase**: Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
3. **Dependencies**: Install requirements:
   ```bash
   pip install supabase python-dotenv
   ```

### How It Works

1. **On Startup**:
   - Loads all schemas from `1. Designer/Schemas.md`
   - Queries Supabase for current question counts
   - Calculates required questions: `5 + current_count` per schema
   - Orders schemas: M → P → B → C

2. **During Generation**:
   - Generates questions one at a time
   - Uses existing difficulty weights (30% Easy, 50% Medium, 20% Hard)
   - Saves immediately to:
     - Supabase (`ai_generated_questions` table)
     - Local backup (`backups/YYYY-MM-DD/questions.jsonl`)
   - Updates progress in real-time
   - Moves to next schema when requirement met

3. **On Stop**:
   - Safely stops after current question completes
   - Progress is saved (resume continues from where it left off)

## UI Layout

```
┌─────────────────────────────────────────┐
│  ESAT Question Generator                │
│                                         │
│  [Start Generation]  [Stop]             │
│                                         │
│  Status: Generating M3 (Medium)...      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Schema Progress                   │ │
│  │                                   │ │
│  │ ✓ M1: 7/7 questions [COMPLETE]   │ │
│  │ ✓ M2: 6/6 questions [COMPLETE]   │ │
│  │ ▶ M3: 4/8 questions [IN PROGRESS]│ │
│  │   M4: 0/5 questions [PENDING]    │ │
│  │   ...                             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Overall: 17/250 questions (6.8%)       │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│                                         │
│  Last Generated: M2-Medium-abc123       │
│  Success Rate: 87% (17/19 attempts)     │
│  Elapsed: 12m 34s                       │
└─────────────────────────────────────────┘
```

## Configuration

Edit difficulty weights in `simple_generator_ui.py`:

```python
self.cfg = RunConfig(
    difficulty_weights={
        "Easy": 0.3,    # 30%
        "Medium": 0.5,  # 50%
        "Hard": 0.2,    # 20%
    },
    ...
)
```

## Files

- **simple_generator_ui.py**: Main UI application
- **project.py**: Generation pipeline (unchanged)
- **db_sync.py**: Supabase sync logic
- **_old/**: Archived old UI files

## Notes

- **Single-threaded**: Generates one question at a time for reliability
- **No caching**: Queries DB on startup to get current counts
- **Resume-friendly**: Stop and restart anytime, picks up where it left off
- **Fail-safe**: Failures are tracked but don't stop generation

## Troubleshooting

### "No schemas parsed" error
- Check that `1. Designer/Schemas.md` exists
- Verify schema format: `## **M1. Title**` (with period after number)

### Supabase connection error
- Verify `.env.local` has correct credentials
- Check network connection
- Test with: `python test_api_key.py`

### UI doesn't start
- Check for Python errors in terminal
- Verify tkinter is installed: `python -m tkinter`
- Check API key is present

## Old Files

Old UI files have been moved to `_old/` directory:
- `question_review_app.py`
- `run_review_app.py`
- `question_review/` (entire directory)
- `generate_with_progress.py`
- `worker_manager.py`

These are kept for reference but are no longer used.


