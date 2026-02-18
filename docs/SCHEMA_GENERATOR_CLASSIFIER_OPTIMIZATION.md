# Schema Generator Subject Classifier Optimization

## Change Made

**Before**: Subject classification used the main `gemini_client` (default: `gemini-2.5-flash`)
**After**: Subject classification now uses a separate, cheaper client with `gemini-1.5-flash` (default)

## Why This Works

Subject classification is a **simple task** that doesn't need the latest model:
- Just classifying questions into: mathematics, physics, chemistry, biology
- Simple JSON output
- Low complexity reasoning

`gemini-1.5-flash` is:
- ✅ **Cheaper** (lower cost per token)
- ✅ **Faster** (lower latency)
- ✅ **Still accurate** for classification tasks
- ✅ **Higher rate limits** (less likely to hit limits)

## Location

The classification happens in `run_full_schema_pipeline()` function:
- Function: `_preclassify()` (line ~4182)
- Uses: `classifier_client.generate_json(prompt)`
- Model: `gemini-1.5-flash` (configurable)

## Configuration

You can override the classifier model via environment variable:

```env
# In .env.local
SCHEMA_CLASSIFIER_MODEL=gemini-1.5-flash  # Default (cheapest)
# OR
SCHEMA_CLASSIFIER_MODEL=gemini-2.5-flash  # If you want newer model
```

## Impact

- **Cost savings**: Classification is cheaper per question
- **Speed**: Faster classification (lower latency)
- **Rate limits**: Less likely to hit limits (higher quotas for older models)
- **Quality**: Should be identical (classification is simple enough for 1.5-flash)

## Model Usage in Schema Generator

| Task | Model | Reason |
|------|-------|--------|
| Subject Classification | `gemini-1.5-flash` | **Simple task - cheaper!** |
| Micro-schema Extraction | `gemini-2.5-flash` | Moderate complexity |
| Schema Writing | `gemini-2.5-flash` | Moderate complexity |
| Other Operations | `gemini-2.5-flash` | Default |
