# Tag Labeler Flow: How Curriculum Topics Are Filtered by Subject

## Overview

The tag labeler uses the `schema_id` to determine which curriculum topics are relevant, then filters the curriculum list to show only those topics to the AI. This ensures the AI only sees and assigns tags from the correct subject area.

---

## Flow Diagram

```
Question with schema_id (e.g., "M96", "P3", "B1", "C1")
    ↓
classifier_call() / tag_labeler_call()
    ↓
curriculum_parser.get_available_topics_for_schema(schema_id)
    ↓
get_papers_for_schema(schema_id)  [Filters by first letter]
    ↓
For each paper: get_topics_for_paper(paper_id)
    ↓
Format topics with prefixed codes (M1-M1, M2-MM1, P-P1, etc.)
    ↓
Pass filtered topic list to AI in user prompt
    ↓
AI assigns primary_tag and secondary_tags from the filtered list
```

---

## Step-by-Step Process

### Step 1: Schema ID Analysis

The `schema_id` determines which subject area the question belongs to:

- **M*** (e.g., `M96`, `M1`, `M50`) → Mathematics
- **P*** (e.g., `P3`, `P1`, `P98`) → Physics
- **B*** (e.g., `B1`, `B10`, `B45`) → Biology
- **C*** (e.g., `C1`, `C17`, `C78`) → Chemistry

### Step 2: Paper Filtering (`get_papers_for_schema`)

Based on the schema prefix, the system determines which papers are available:

```python
def get_papers_for_schema(self, schema_id: str) -> List[str]:
    prefix = schema_id[0].upper()
    
    if prefix == "M":
        # Math schemas can use Math 1 OR Math 2 (interchangeable)
        return ["math1", "math2"]
    elif prefix == "P":
        # Physics schemas only use Physics
        return ["physics"]
    elif prefix == "B":
        # Biology schemas only use Biology
        return ["biology"]
    elif prefix == "C":
        # Chemistry schemas only use Chemistry
        return ["chemistry"]
```

**Key Points:**
- **Math schemas** (`M*`) get BOTH Math 1 and Math 2 topics (AI chooses which fits)
- **Other subjects** get only their specific paper topics

### Step 3: Topic Retrieval (`get_topics_for_paper`)

For each paper ID, retrieve all topics from that paper:

```python
def get_topics_for_paper(self, paper_id: str) -> List[Dict]:
    paper = self.papers_by_id.get(paper_id)
    return paper["topics"]  # Returns list of {code, title} dicts
```

### Step 4: Topic Formatting (`get_available_topics_for_schema`)

All topics are formatted with prefixed codes:

```python
def get_available_topics_for_schema(self, schema_id: str) -> List[Dict]:
    papers = self.get_papers_for_schema(schema_id)  # ["math1", "math2"] or ["physics"], etc.
    all_topics = []
    
    for paper_id in papers:
        topics = self.get_topics_for_paper(paper_id)
        for topic in topics:
            raw_code = topic["code"]  # e.g., "M1", "MM1", "P1", "B1"
            prefixed_code = self._get_prefixed_code(paper_id, raw_code)  # e.g., "M1-M1", "M2-MM1", "P-P1", "biology-B1"
            all_topics.append({
                "code": prefixed_code,  # Main code for AI to use
                "title": topic["title"],
                "paper_id": paper_id,
                "paper_name": paper["paper_name"],
                "raw_code": raw_code
            })
    
    return all_topics
```

**Prefix Formatting Rules:**
- Math 1: `M1-{code}` (e.g., `M1-M1`, `M1-M4`)
- Math 2: `M2-{code}` (e.g., `M2-MM1`, `M2-MM7`)
- Physics: `P-{code}` (e.g., `P-P1`, `P-P3`)
- Biology: `biology-{code}` (e.g., `biology-B1`, `biology-B10`)
- Chemistry: `chemistry-{code}` (e.g., `chemistry-C1`, `chemistry-C17`)

### Step 5: Prompt Construction (`classifier_call`)

The filtered topic list is formatted as YAML and passed to the AI:

```python
available_topics = curriculum_parser.get_available_topics_for_schema(schema_id)

topics_text = yaml.safe_dump({
    "available_topics": [
        {
            "code": topic["code"],      # Prefixed code (e.g., "M1-M1", "P-P1")
            "title": topic["title"],    # Human-readable title
            "paper": topic["paper_name"]  # Paper name (e.g., "Mathematics 1", "Physics")
        }
        for topic in available_topics
    ]
}, sort_keys=False)

user = f"""Available curriculum topics:
{topics_text}

Question package (YAML):
{yaml.safe_dump(question_obj, sort_keys=False)}

Analyze the question and assign appropriate curriculum tags."""
```

### Step 6: AI Tag Assignment

The AI receives:
1. **Filtered topic list** - Only topics relevant to the schema's subject
2. **Question package** - The actual question to analyze
3. **System prompt** - Subject-specific classifier prompt (e.g., `Math Classifier.md`, `Physics Classifier.md`)

The AI then:
- Analyzes the question content
- Selects `primary_tag` from the available topics
- Optionally selects 0-3 `secondary_tags`
- For Math: Also determines `paper` (Math 1 or Math 2)
- Provides confidence scores

---

## Examples

### Example 1: Math Schema (M96)

**Input:**
- `schema_id = "M96"`

**Process:**
1. Prefix = "M" → Papers = `["math1", "math2"]`
2. Get all Math 1 topics: `M1-M1`, `M1-M2`, `M1-M3`, `M1-M4`, `M1-M5`, `M1-M6`, `M1-M7`
3. Get all Math 2 topics: `M2-MM1`, `M2-MM2`, `M2-MM3`, `M2-MM4`, `M2-MM5`, `M2-MM6`, `M2-MM7`
4. **AI sees 14 topics total** (7 from Math 1 + 7 from Math 2)
5. AI chooses based on question content (e.g., `M2-MM7` if it involves calculus)

**Output:**
```yaml
primary_tag: M2-MM7
secondary_tags: [M2-MM1]
paper: Math 2
```

### Example 2: Physics Schema (P3)

**Input:**
- `schema_id = "P3"`

**Process:**
1. Prefix = "P" → Papers = `["physics"]`
2. Get all Physics topics: `P-P1`, `P-P2`, `P-P3`, `P-P4`, `P-P5`, `P-P6`, `P-P7`
3. **AI sees 7 topics total** (only Physics)
4. AI chooses based on question content (e.g., `P-P3` for mechanics)

**Output:**
```yaml
primary_tag: P-P3
secondary_tags: [P-P1]
```

### Example 3: Biology Schema (B10)

**Input:**
- `schema_id = "B10"`

**Process:**
1. Prefix = "B" → Papers = `["biology"]`
2. Get all Biology topics: `biology-B1`, `biology-B2`, ..., `biology-B11`
3. **AI sees 11 topics total** (only Biology)
4. AI chooses based on question content (e.g., `biology-B10` for ecosystems)

**Output:**
```yaml
primary_tag: biology-B10
secondary_tags: []
```

### Example 4: Chemistry Schema (C4)

**Input:**
- `schema_id = "C4"`

**Process:**
1. Prefix = "C" → Papers = `["chemistry"]`
2. Get all Chemistry topics: `chemistry-C1`, `chemistry-C2`, ..., `chemistry-C17`
3. **AI sees 17 topics total** (only Chemistry)
4. AI chooses based on question content (e.g., `chemistry-C4` for quantitative chemistry)

**Output:**
```yaml
primary_tag: chemistry-C4
secondary_tags: [chemistry-C3]
```

---

## Validation

After the AI assigns tags, the system validates:

1. **Subject Match**: Ensures tags match the schema's subject
   - Math schemas → Only `M1-*` or `M2-*` tags allowed
   - Physics schemas → Only `P-*` tags allowed
   - Biology schemas → Only `biology-*` tags allowed
   - Chemistry schemas → Only `chemistry-*` tags allowed

2. **Format Validation**: Ensures tags use prefixed format (not raw codes)

3. **Paper Assignment** (Math only): Ensures `paper` field is set to "Math 1" or "Math 2"

---

## Code Locations

### Main Function
- **File**: `scripts/esat_question_generator/project.py`
- **Function**: `classifier_call()` (lines 691-794)
- **Alias**: `tag_labeler_call()` (line 798-801)

### Curriculum Parser
- **File**: `scripts/esat_question_generator/curriculum_parser.py`
- **Key Methods**:
  - `get_papers_for_schema()` (lines 86-112)
  - `get_topics_for_paper()` (lines 114-127)
  - `get_available_topics_for_schema()` (lines 165-194)
  - `_get_prefixed_code()` (lines 59-84)

### Curriculum Data
- **File**: `scripts/esat_question_generator/curriculum/ESAT_CURRICULUM.json`
- **Source**: ESAT Content Specification (May 2024)

### Prompts
- **Math**: `scripts/esat_question_generator/by_subject_prompts/Maths/Math Classifier.md`
- **Physics**: `scripts/esat_question_generator/by_subject_prompts/Physics/Physics Classifier.md`
- **Biology**: `scripts/esat_question_generator/by_subject_prompts/Biology/Biology Classifier.md`
- **Chemistry**: `scripts/esat_question_generator/by_subject_prompts/Chemistry/Chemistry Classifier.md`

---

## Key Insights

1. **Subject Isolation**: The AI never sees topics from other subjects, preventing cross-contamination
2. **Math Flexibility**: Math schemas can choose between Math 1 and Math 2 based on question content
3. **Prefixed Format**: All tags use prefixed format to avoid confusion with schema IDs
4. **Validation**: System validates tags match the schema's subject before saving
5. **Paper Classification**: For Math, the AI also determines which paper (Math 1 or Math 2) the question belongs to

---

## Current State

From database analysis:
- **604/672 questions (90%)** are untagged
- **68 questions (10%)** have tags assigned
- Some tags use invalid formats (e.g., `biology-5`, `M1-7` instead of proper prefixes)
- Most questions have `paper = NULL` (not classified)

The tagging system is working correctly when used, but most questions haven't been tagged yet.






















