# Daily Quota Exhaustion - Automatic Fallback Guide

## Problem
You're hitting **daily quota limits** for Gemini 3 Pro, which is different from per-minute rate limits. Daily quotas reset after 24 hours.

## Solution
The system now automatically detects daily quota exhaustion and falls back to alternative models.

## How It Works

### 1. **Automatic Detection**
When a model hits its daily quota, the system detects:
- `RESOURCE_EXHAUSTED` errors
- `quota exceeded` messages
- `429` errors with quota-related messages

### 2. **Model Fallback Chain**
The system automatically tries fallback models in this order:

```
gemini-3-pro-preview → gemini-2.5-pro → gemini-2.5-flash
gemini-3-pro         → gemini-2.5-pro → gemini-2.5-flash
gemini-2.5-pro       → gemini-2.5-flash
gemini-2.5-flash     → (no fallback - cheapest tier)
```

### 3. **Automatic Model Tracking**
- Exhausted models are marked for 24 hours
- System automatically avoids exhausted models
- Falls back to next available model
- Tracks exhaustion across all workers (thread-safe)

## Example Flow

```
1. Try gemini-3-pro-preview → Daily quota exhausted
2. Automatically switch to gemini-2.5-pro → Success!
3. Continue generating with gemini-2.5-pro
4. gemini-3-pro-preview marked as exhausted for 24h
```

## Configuration

### Default Behavior
The system automatically handles fallbacks - **no configuration needed**.

### Manual Model Selection
If you want to use cheaper models from the start (to avoid hitting limits):

```bash
# In .env.local - Use cheaper models for high-volume stages
MODEL_DESIGNER=gemini-2.5-pro          # Instead of gemini-3-pro-preview
MODEL_IMPLEMENTER=gemini-2.5-pro       # Instead of gemini-3-pro-preview
MODEL_VERIFIER=gemini-2.5-flash        # Already cheap
MODEL_STYLE=gemini-2.5-flash           # Already cheap
MODEL_CLASSIFIER=gemini-2.5-flash      # Already cheap
```

### Model Quality vs. Cost

| Model | Quality | Daily Quota | Cost | Best For |
|-------|---------|-------------|------|----------|
| `gemini-3-pro-preview` | Highest | Lowest | Highest | Designer, Implementer |
| `gemini-2.5-pro` | High | Medium | Medium | Fallback for Designer/Implementer |
| `gemini-2.5-flash` | Good | Highest | Lowest | Verifier, Style, Classifier |

## Strategies to Avoid Daily Limits

### 1. **Use Cheaper Models for Non-Critical Stages**
```bash
# Keep expensive models only for critical stages
MODEL_DESIGNER=gemini-3-pro-preview      # Needs creativity
MODEL_IMPLEMENTER=gemini-2.5-pro         # Can use cheaper
MODEL_VERIFIER=gemini-2.5-flash          # Already cheap
MODEL_STYLE=gemini-2.5-flash             # Already cheap
```

### 2. **Generate in Smaller Batches**
Instead of generating 100 questions at once:
- Generate 20 questions, wait a few hours
- Generate another 20, etc.
- Spread generation across the day

### 3. **Use Multiple API Keys** (if available)
If you have multiple Google Cloud projects:
- Rotate API keys in `.env.local`
- Each key has its own daily quota

### 4. **Monitor Exhaustion**
Watch for these log messages:
```
[LLMClient] ⚠️  Marked gemini-3-pro-preview as exhausted (daily quota). Will avoid for 24.0 hours.
[LLMClient] ⚠️  gemini-3-pro-preview daily quota exhausted. Falling back to gemini-2.5-pro
```

## What Happens When All Models Are Exhausted?

If all models in the fallback chain are exhausted:
```
Error: Model gemini-3-pro-preview daily quota exhausted.
       No fallback available. Please wait 24 hours or use a different model.
```

**Solutions:**
1. Wait 24 hours for quota reset
2. Use a different API key (if available)
3. Manually configure cheaper models in `.env.local`

## Automatic Recovery

After 24 hours:
```
[LLMClient] ✓ gemini-3-pro-preview quota reset - can use again
```

The system automatically detects when quotas reset and resumes using the primary model.

## Best Practices

1. **Start with Expensive Models**: Use `gemini-3-pro-preview` for Designer/Implementer
2. **Let System Fallback**: Don't manually switch - let automatic fallback handle it
3. **Monitor Logs**: Watch for exhaustion messages to understand usage patterns
4. **Plan Batches**: Generate in smaller batches to avoid exhausting all models at once
5. **Use Cheaper Models for High-Volume Stages**: Verifier, Style, Classifier can use Flash

## Summary

✅ **Automatic daily quota detection**
✅ **Automatic fallback to alternative models**
✅ **24-hour exhaustion tracking**
✅ **Thread-safe across all workers**
✅ **No manual intervention needed**

The system will automatically handle daily quota exhaustion and continue generating questions using fallback models!






