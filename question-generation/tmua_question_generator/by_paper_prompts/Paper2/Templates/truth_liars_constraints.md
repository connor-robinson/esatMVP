### TEMPLATE: truth_liars_constraints (AUTHORITATIVE)

You must implement the Designer plan using **truth-tellers/liars** or constraint-logic counting.

#### Required stem structure
- Define the rule precisely (e.g. “A always tells the truth”, “B always lies”, “exactly one person lies”, etc.).
- Provide 3–6 short statements said by agents.
- Ask for a determinate output, typically:
  - smallest/ largest possible number satisfying constraints
  - how many could be telling the truth
  - which person is the liar, etc.

#### Option form
- If asking smallest/largest pair: options are pairs (A–F) in a fixed format.
- If asking identity: options are the agent labels.
- Keep option formatting consistent and easy to scan.

#### Distractor requirements
Include common mistakes:
- forgetting “exactly” vs “at least”
- assuming independence when constraints couple them
- missing a valid configuration
- mixing up who lies vs statement truth value

#### Constraint
Avoid large search trees.
The constraints should collapse logically in a few deductions.
