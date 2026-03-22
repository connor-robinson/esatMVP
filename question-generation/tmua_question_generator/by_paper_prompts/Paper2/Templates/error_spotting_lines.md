### TEMPLATE: error_spotting_lines (AUTHORITATIVE)

You must implement the Designer plan using the **student-working / line-labelled** format.

#### Required stem structure
- Present a short “student solution” or “argument” consisting of **4–7 lines**.
- Label each line clearly as **(I), (II), (III), ...**
- Each line must be a single clear step (no long paragraphs).
- The prompt must ask one of:
  - “On which line does the first error occur?”
  - “Which line is unjustified?”
  - “Which line is the first incorrect statement?”
- If the Designer plan requires “no error”, you may include an option meaning “no error occurs”, but only if explicitly supported.

#### Option form (choose one, be consistent)
- Preferred: options A–F are line labels (e.g. “Line (II)”, …) plus possibly “No error”.
- Ensure **exactly one** option is correct.

#### Distractor requirements (logic-based)
- Each wrong option must correspond to a **plausible but incorrect** diagnosis, e.g.:
  - picking a later line when the first error is earlier
  - missing a hidden assumption (division by zero possibility, domain restriction)
  - confusing converse/contrapositive
  - invalid cancellation / squaring both sides introduces extraneous solutions
  - quantifier misuse (treating “some” as “all”)
- Do NOT make distractors “arithmetic slip”.

#### Key Paper 2 constraints
- The error must be a **reasoning/validity** error, not a typo.
- The “first error” must be objectively identifiable from the text alone.
- Ensure all necessary domain/definitions are stated in the stem.

#### Output contract reminder
Your YAML `question.stem` must include the labelled lines, preserved exactly.
