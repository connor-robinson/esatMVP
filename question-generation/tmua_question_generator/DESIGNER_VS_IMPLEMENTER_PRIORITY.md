# Designer vs Implementer: Which Should Use 3 Pro?

## Quick Answer

**If you can only use 3 Pro for ONE stage: Use it for Designer.**

**If you have quota: Use 3 Pro for both Designer and Implementer.**

## Why Designer is More Critical

### Designer's Role (More Complex Reasoning)
- ✅ **Creates the foundation** - Designs the reasoning structure, difficulty, constraints
- ✅ **FAR mode creativity** - Must come up with `surface_twist` and `why_still_on_spec`
- ✅ **Complex reasoning** - Understands schema, misconceptions, intended wrong paths
- ✅ **Sets difficulty** - Calibrates the question's challenge level
- ✅ **If Designer fails** - The entire question fails (bad foundation = bad question)

### Implementer's Role (More Execution)
- ✅ **Follows the plan** - Takes Designer's idea and writes the question text
- ✅ **Style matching** - Matches TMUA style from references
- ✅ **Can be corrected** - Verifier and Style Checker can catch and fix mistakes
- ✅ **More mechanical** - Writing task rather than creative reasoning task

## Real-World Impact

### Scenario 1: 3 Pro for Designer Only
```bash
MODEL_DESIGNER=gemini-3-pro-preview      # ✅ Best creativity
MODEL_IMPLEMENTER=gemini-2.5-pro         # ✅ Good enough
```

**Result:**
- Excellent idea plans, creative FAR mode variations
- Good question text (2.5 Pro is sufficient for writing)
- Verifier/Style Checker can catch any Implementer issues

### Scenario 2: 3 Pro for Implementer Only
```bash
MODEL_DESIGNER=gemini-2.5-pro            # ⚠️ May struggle with complex FAR mode
MODEL_IMPLEMENTER=gemini-3-pro-preview   # ✅ Best writing
```

**Result:**
- Good idea plans (2.5 Pro is usually fine)
- Excellent question text
- **BUT**: If Designer creates a weak idea, even perfect Implementer can't save it

### Scenario 3: 3 Pro for Both (Ideal)
```bash
MODEL_DESIGNER=gemini-3-pro-preview      # ✅ Best creativity
MODEL_IMPLEMENTER=gemini-3-pro-preview   # ✅ Best writing
```

**Result:**
- Maximum quality throughout
- Best FAR mode creativity
- Most accurate question text
- **Trade-off**: Lower daily quota (~10-20 questions/day)

## Specific to FAR Mode

**FAR mode requires:**
- Creative `surface_twist` ideas
- Understanding how to disguise a question while staying on spec
- Complex reasoning about "why_still_on_spec"

**3 Pro vs 2.5 Pro for FAR mode:**
- **3 Pro**: More creative, better at coming up with novel disguises
- **2.5 Pro**: Good, but may produce less creative variations

**Impact:** If you're generating many FAR mode questions, 3 Pro for Designer makes a noticeable difference.

## Recommendation

### Option 1: Maximum Quality (If Quota Allows)
```bash
MODEL_DESIGNER=gemini-3-pro-preview
MODEL_IMPLEMENTER=gemini-3-pro-preview
```
**Use when:** You need maximum quality, can accept ~10-20 questions/day

### Option 2: Designer Priority (Recommended)
```bash
MODEL_DESIGNER=gemini-3-pro-preview      # Best creativity
MODEL_IMPLEMENTER=gemini-2.5-pro         # Good enough
```
**Use when:** You want best ideas but need better daily quota (~40-100 questions/day)

### Option 3: Balanced (If Quota is Tight)
```bash
MODEL_DESIGNER=gemini-2.5-pro            # Still good
MODEL_IMPLEMENTER=gemini-2.5-pro         # Still good
```
**Use when:** You need maximum throughput, quality is acceptable

## Automatic Fallback

Remember: The system has automatic fallback built in!

If you set:
```bash
MODEL_DESIGNER=gemini-3-pro-preview
MODEL_IMPLEMENTER=gemini-3-pro-preview
```

And 3 Pro hits daily quota:
- System automatically falls back to 2.5 Pro
- Then to Flash if needed
- No manual intervention required

**So you can start with 3 Pro for both, and the system will gracefully degrade as quotas are exhausted!**

## Bottom Line

**If you want to use 3 Pro for one stage:**
- ✅ **Use it for Designer** - More critical, requires more complex reasoning

**If you have quota:**
- ✅ **Use it for both** - Maximum quality, automatic fallback handles quota exhaustion






