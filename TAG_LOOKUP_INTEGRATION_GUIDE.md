# Curriculum Tag Lookup Integration Guide

This guide explains how to integrate curriculum tag lookup functionality into your website, including Math 1 vs Math 2 classification.

## 📍 Where to Find Math 1 vs Math 2

### Database Storage

**Table:** `ai_generated_questions`  
**Column:** `paper` (type: `text`, nullable)

**Values:**
- `"Math 1"` - For Math 1 questions
- `"Math 2"` - For Math 2 questions  
- `NULL` - For non-math questions (Physics, Biology, Chemistry)

**Database Schema:**
```sql
-- Column definition
paper text CHECK (paper IS NULL OR paper IN ('Math 1', 'Math 2'))

-- Index for filtering
CREATE INDEX idx_ai_questions_paper ON ai_generated_questions(paper);
```

### How Math 1/2 is Determined

1. **During Generation:** The Math Classifier AI analyzes each math question and assigns it to either "Math 1" or "Math 2" based on:
   - **Math 1:** Foundational topics, no calculus required, routine execution
   - **Math 2:** Requires differentiation/integration, optimization, mathematical maturity

2. **Storage:** The `paper` field is stored in the `tags` object during generation and then saved to the database `paper` column.

3. **Fallback Logic:** If `paper` is NULL but `primary_tag` starts with `M1-`, it's Math 1. If `primary_tag` starts with `M2-`, it's Math 2.

## 🏷️ Curriculum Tag Format

### Tag Prefix Structure

All curriculum tags follow a **prefixed format**: `<paper_prefix>-<topic_code>`

| Subject | Paper Prefix | Example Tags | Notes |
|---------|-------------|--------------|-------|
| **Math 1** | `M1-` | `M1-M1`, `M1-M2`, `M1-M3` | Foundational math topics |
| **Math 2** | `M2-` | `M2-MM1`, `M2-MM2`, `M2-MM3` | Advanced math topics |
| **Physics** | `P-` | `P-P1`, `P-P2`, `P-P3` | All physics topics |
| **Biology** | `biology-` | `biology-B1`, `biology-B2`, `biology-B3` | All biology topics |
| **Chemistry** | `chemistry-` | `chemistry-C1`, `chemistry-C2`, `chemistry-C3` | All chemistry topics |

### Database Fields

**Table:** `ai_generated_questions`

- `primary_tag` (text, nullable) - Main curriculum topic (e.g., `"M1-M5"`, `"P-P3"`, `"chemistry-C5"`)
- `secondary_tags` (text[], nullable) - Additional relevant topics (array of prefixed codes)
- `tags_confidence` (jsonb, nullable) - Confidence scores for each tag
- `paper` (text, nullable) - **Math only:** `"Math 1"` or `"Math 2"`

## 🔍 Tag Lookup Process

### 1. Curriculum Data Source

**Location:** `scripts/esat_question_generator/by_subject_prompts/ESAT curriculum.md`

This file contains the complete curriculum structure in JSON format with:
- All papers (Math 1, Math 2, Physics, Biology, Chemistry)
- All topics with codes, titles, and descriptions
- Paper-to-topic mappings

### 2. Python Lookup Utility

**File:** `scripts/esat_question_generator/lookup_tag.py`

**Usage:**
```bash
# Look up a specific tag
python lookup_tag.py M2-MM1
python lookup_tag.py biology-B1
python lookup_tag.py P-P3
python lookup_tag.py chemistry-C5

# List all available tags
python lookup_tag.py --list
```

**Output Example:**
```
✓ Found tag: M2-MM1
  Title: Functions and Graphs
  Paper: Math 2 (math2)
  Prefixed Code: M2-MM1
  Description: Advanced function analysis...
```

### 3. Curriculum Parser API

**File:** `scripts/esat_question_generator/curriculum_parser.py`

**Key Methods:**

```python
from curriculum_parser import CurriculumParser

parser = CurriculumParser("path/to/ESAT curriculum.md")

# Get topic information
topic_info = parser.get_topic_info("M2-MM1")
# Returns: { "code": "MM1", "title": "Functions and Graphs", "paper_id": "math2", ... }

# Normalize a tag (convert raw code to prefixed)
normalized = parser.normalize_topic_code("MM1")  # Returns: "M2-MM1"

# Validate a tag exists
is_valid = parser.validate_topic_code("M2-MM1")  # Returns: True

# Get all topics for a paper
topics = parser.get_topics_for_paper("math2")  # Returns list of Math 2 topics
```

## 🌐 Website Integration

### Option 1: Create a Tag Lookup API Endpoint

**Create:** `src/app/api/tags/lookup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load curriculum data (or cache it)
const curriculumPath = join(process.cwd(), 'scripts/esat_question_generator/by_subject_prompts/ESAT curriculum.md');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tagCode = searchParams.get('tag');
  
  if (!tagCode) {
    return NextResponse.json({ error: 'Tag code required' }, { status: 400 });
  }
  
  try {
    // Load and parse curriculum
    const curriculumData = JSON.parse(readFileSync(curriculumPath, 'utf-8'));
    
    // Find tag in curriculum
    let topicInfo = null;
    for (const paper of curriculumData.papers) {
      for (const topic of paper.topics) {
        const prefixedCode = getPrefixedCode(paper.paper_id, topic.code);
        if (prefixedCode === tagCode || topic.code === tagCode) {
          topicInfo = {
            code: prefixedCode,
            title: topic.title,
            paper_id: paper.paper_id,
            paper_name: paper.paper_name,
            description: topic.description || null,
          };
          break;
        }
      }
      if (topicInfo) break;
    }
    
    if (!topicInfo) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    return NextResponse.json(topicInfo);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to lookup tag' }, { status: 500 });
  }
}

function getPrefixedCode(paperId: string, topicCode: string): string {
  if (paperId === 'math1') return `M1-${topicCode}`;
  if (paperId === 'math2') return `M2-${topicCode}`;
  if (paperId === 'physics') return `P-${topicCode}`;
  return `${paperId}-${topicCode}`;
}
```

**Usage:**
```typescript
// Frontend call
const response = await fetch(`/api/tags/lookup?tag=M2-MM1`);
const tagInfo = await response.json();
// { code: "M2-MM1", title: "Functions and Graphs", paper_name: "Math 2", ... }
```

### Option 2: Client-Side Tag Lookup Component

**Create:** `src/components/tags/TagLookup.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface TagInfo {
  code: string;
  title: string;
  paper_name: string;
  description?: string;
}

export function TagLookup({ tagCode }: { tagCode: string }) {
  const [tagInfo, setTagInfo] = useState<TagInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/tags/lookup?tag=${encodeURIComponent(tagCode)}`)
      .then(res => res.json())
      .then(data => {
        setTagInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tagCode]);
  
  if (loading) return <span className="text-neutral-400">Loading...</span>;
  if (!tagInfo) return <span className="text-neutral-500">{tagCode}</span>;
  
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-medium">{tagInfo.code}</span>
      <span className="text-neutral-400">-</span>
      <span className="text-neutral-300">{tagInfo.title}</span>
      {tagInfo.paper_name && (
        <span className="text-xs text-neutral-500">({tagInfo.paper_name})</span>
      )}
    </div>
  );
}
```

### Option 3: Display Math 1/2 in Question Lists

**Update:** `src/components/questionBank/QuestionCard.tsx` (or similar)

```typescript
interface Question {
  id: string;
  primary_tag: string | null;
  paper: string | null;  // "Math 1" | "Math 2" | null
  schema_id: string;
  // ... other fields
}

export function QuestionCard({ question }: { question: Question }) {
  // Determine Math paper from paper field or primary_tag
  const mathPaper = question.paper || 
    (question.primary_tag?.startsWith('M1-') ? 'Math 1' : 
     question.primary_tag?.startsWith('M2-') ? 'Math 2' : null);
  
  return (
    <div>
      {/* Display Math 1/2 badge for math questions */}
      {mathPaper && (
        <span className="badge">{mathPaper}</span>
      )}
      
      {/* Display primary tag with lookup */}
      {question.primary_tag && (
        <TagLookup tagCode={question.primary_tag} />
      )}
    </div>
  );
}
```

### Option 4: Filter Questions by Math 1/2

**Current Implementation:** `src/app/api/question-bank/questions/route.ts`

The existing code already handles Math 1/2 filtering:

```typescript
if (subject === 'Math 1') {
  // Math 1: paper = "Math 1" OR primary_tag starts with "M1-" OR schema_id = "M1"
  query = query.or('paper.eq."Math 1",primary_tag.ilike.M1-%,schema_id.eq.M1');
} else if (subject === 'Math 2') {
  // Math 2: paper = "Math 2" OR primary_tag starts with "M2-" OR schema_id in (M2, M3, M4)
  query = query.or('paper.eq."Math 2",primary_tag.ilike.M2-%,schema_id.in.(M2,M3,M4)');
}
```

## 📊 Current Website Usage

### Where Tags Are Used

1. **Question Review Page** (`src/app/questions/review/page.tsx`)
   - Displays `primary_tag` and `secondary_tags` for each question
   - Allows manual editing of tags

2. **Question Bank API** (`src/app/api/question-bank/questions/route.ts`)
   - Filters by `primary_tag` and `secondary_tags`
   - Uses `paper` field for Math 1/2 filtering

3. **Question Detail View** (`src/components/questions/SimplifiedQuestionDetailView.tsx`)
   - Shows curriculum tags section
   - Allows editing tags

### Database Query Examples

```typescript
// Get all Math 1 questions
const { data } = await supabase
  .from('ai_generated_questions')
  .select('*')
  .eq('paper', 'Math 1');

// Get questions by primary tag
const { data } = await supabase
  .from('ai_generated_questions')
  .select('*')
  .eq('primary_tag', 'M2-MM1');

// Get questions with tag in secondary_tags array
const { data } = await supabase
  .from('ai_generated_questions')
  .select('*')
  .contains('secondary_tags', ['M1-M2']);
```

## ✅ Implementation Checklist

For another agent implementing this:

- [ ] **Load curriculum data** - Read `ESAT curriculum.md` (JSON format)
- [ ] **Create tag lookup API** - `/api/tags/lookup?tag=<code>` endpoint
- [ ] **Parse tag format** - Extract paper prefix and topic code
- [ ] **Match in curriculum** - Find topic in curriculum JSON structure
- [ ] **Return tag info** - Title, paper name, description
- [ ] **Display in UI** - Show tag codes with human-readable titles
- [ ] **Handle Math 1/2** - Use `paper` field or infer from `primary_tag` prefix
- [ ] **Cache curriculum** - Load once, reuse (consider Redis or in-memory cache)
- [ ] **Error handling** - Handle invalid/missing tags gracefully
- [ ] **TypeScript types** - Define interfaces for tag info structure

## 🔗 Related Files

- **Curriculum Data:** `scripts/esat_question_generator/by_subject_prompts/ESAT curriculum.md`
- **Python Parser:** `scripts/esat_question_generator/curriculum_parser.py`
- **Lookup Utility:** `scripts/esat_question_generator/lookup_tag.py`
- **Database Schema:** `supabase/migrations/20251222000000_add_paper_column.sql`
- **Type Definitions:** `src/lib/supabase/types.ts` (lines 276-340)
- **Question Bank API:** `src/app/api/question-bank/questions/route.ts`
- **Question Detail View:** `src/components/questions/SimplifiedQuestionDetailView.tsx`

## 📝 Notes

1. **Tag Format Consistency:** Always use prefixed format (`M1-M5`, not just `M5`)
2. **Math 1/2 Priority:** Check `paper` field first, then fall back to `primary_tag` prefix
3. **Null Handling:** `primary_tag` can be `NULL` - handle gracefully in UI
4. **Performance:** Consider caching curriculum data in memory or Redis
5. **Validation:** Validate tags against curriculum before saving to database
