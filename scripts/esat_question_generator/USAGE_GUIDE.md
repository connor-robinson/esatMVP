# Question Review App - Usage Guide

## Quick Start

**Run the app:**
- Double-click `run_review_app.bat` (Windows)
- Or run: `python run_review_app.py`

**Requirements:**
- Python with dependencies installed (`pip install -r requirements_review_app.txt`)
- `.env.local` file with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Interface Overview

The app has 4 main sections:

1. **Top Left: Generation Controls** - Generate new questions
2. **Top Right: Statistics** - View question counts (Total, Pending, Approved, Rejected)
3. **Bottom Left: Question List** - Browse and filter questions
4. **Bottom Right: Question Detail** - View/edit selected question

## Core Workflow

### 1. Generate Questions
- Enter count (1-50) in the spinbox
- Click **"Generate Questions"** to start generation
- Monitor progress in the progress bar
- Click **"Stop"** to cancel generation
- Click **"Reset Status"** to clear generation status

### 2. Browse Questions
- Questions are listed on the left panel (default: pending_review status)
- Filter by:
  - **Primary Tag**: Enter tag name and press Enter or click "Apply Filters"
  - **Secondary Tag**: Enter tag name and press Enter or click "Apply Filters"
- Click **"Clear"** to remove all filters
- Use pagination buttons (`< Previous` / `Next >`) to navigate pages
- Click any question card to view details

### 3. Review & Edit Questions
- Select a question from the list to see full details on the right
- Scroll horizontally if content doesn't fit (use scrollbar at bottom)
- **Edit fields**: Click "Edit" button on any section (Stem, Options, Solution, etc.)
  - Make changes in the text area
  - Click "Save" to apply changes
  - Click "Cancel" to discard changes
- **Edit tags**: Modify primary/secondary tags and click "Save Tags"

### 4. Approve/Reject Questions
- Click **"Approve Question"** (green button) to approve
- Click **"Reject"** (red button) to reject
- Confirm in the dialog box

### 5. Refresh Data
- Press **F5** or use **File → Refresh** menu to reload all data
- Stats auto-refresh every 5 seconds

## Keyboard Shortcuts

- **F5**: Refresh all data

## Tips

- Math expressions render as images inline with text
- Long content has horizontal scrollbars - scroll right to see full content
- Questions default to "pending_review" status - filter to see approved/rejected
- Changes are saved immediately when you click "Save"
- The app keeps math formatting (spaces around `$` and `$$` delimiters)























