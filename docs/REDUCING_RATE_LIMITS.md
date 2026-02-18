# Reducing Rate Limit Hits

## Quick Solutions

### Option 1: Increase Delays (Easiest)

Add to your `.env.local` file:

```env
API_MIN_DELAY=2.0
API_RATE_LIMIT_DELAY=10.0
```

This adds a 2-second delay between ALL API calls and waits 10 seconds after rate limit errors.

### Option 2: Switch to Flash Models (Best for Rate Limits)

Flash models (`gemini-2.5-flash`) have **much higher rate limits** than pro models. Add to `.env.local`:

```env
MODEL_DESIGNER=gemini-2.5-flash
MODEL_IMPLEMENTER=gemini-2.5-flash
API_MIN_DELAY=1.0
API_RATE_LIMIT_DELAY=5.0
```

**Trade-off**: Flash models are faster and cheaper, but may have slightly lower quality for complex reasoning tasks.

### Option 3: Hybrid Approach (Recommended)

Use flash for most stages, pro only for critical stages:

```env
MODEL_DESIGNER=gemini-3-pro-preview
MODEL_IMPLEMENTER=gemini-2.5-flash
MODEL_VERIFIER=gemini-2.5-flash
MODEL_STYLE=gemini-2.5-flash
MODEL_CLASSIFIER=gemini-2.5-flash
API_MIN_DELAY=2.0
API_RATE_LIMIT_DELAY=10.0
```

This keeps high quality for design (most important) but uses flash for implementation/verification (faster, higher limits).

## Current Defaults

- **Designer**: `gemini-3-pro-preview` (pro model - stricter limits)
- **Implementer**: `gemini-3-pro-preview` (pro model - stricter limits)
- **Verifier**: `gemini-2.5-flash` (flash model - higher limits)
- **Style Judge**: `gemini-2.5-flash` (flash model - higher limits)
- **Classifier**: `gemini-2.5-flash` (flash model - higher limits)
- **API_MIN_DELAY**: `2.0` seconds (increased from 0.5s)
- **API_RATE_LIMIT_DELAY**: `10.0` seconds (increased from 5.0s)

## Why Rate Limits Happen

1. **Pro models** (`gemini-3-pro-preview`) have stricter rate limits than flash models
2. **Rapid calls** without delays hit quota limits quickly
3. **Multiple stages** in the pipeline = many API calls per question

## Understanding the Warnings

When you see:
```
[WARN] Rate limit hit, waiting 1.0s before retry 1/3
```

This means:
- The API returned a rate limit error
- The code is automatically retrying with exponential backoff
- It will wait longer on each retry (1s, 2s, 4s, etc.)

The warnings are **informational** - the code is handling it automatically. But reducing the frequency is better for speed.

## Testing Different Configurations

1. **Start with Option 1** (increase delays) - easiest, no quality change
2. **If still hitting limits**, try **Option 2** (all flash) - fastest, may have quality trade-offs
3. **For best balance**, use **Option 3** (hybrid) - good quality + fewer limits

## Monitoring Rate Limits

The code now logs:
- `[WARN] Rate limit hit, waiting X.Xs before retry N/3` - when rate limited
- `[DEBUG] Respecting min_delay=X.Xs, sleeping for Y.Ys` - when respecting min delay

If you see many warnings, increase `API_MIN_DELAY` or switch to flash models.
