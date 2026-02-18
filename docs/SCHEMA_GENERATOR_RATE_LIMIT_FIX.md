# Schema Generator Rate Limit Fix

## Issues Fixed

1. **Wrong Model**: Was using `gemini-2.0-flash` (doesn't exist) → Now uses `gemini-2.5-flash`
2. **Too Short Delays**: `_min_delay = 1.0s` → Now `2.0s` (configurable)
3. **Weak Retry Delays**: Initial delay `1.0s` → Now `5.0s` (configurable)

## Changes Made

### Model Selection
- **Default**: `gemini-2.5-flash` (correct model name)
- **Fallback chain**: `gemini-2.5-flash` → `gemini-1.5-flash` → `gemini-pro`
- **Configurable** via `SCHEMA_GENERATOR_MODEL` environment variable

### Rate Limiting
- **Min delay between requests**: `2.0s` (was 1.0s)
- **Rate limit retry delay**: `5.0s` initial, exponential backoff (was 1.0s)
- **Configurable** via environment variables

## Configuration

Add to your `.env.local` file:

```env
# Model selection (optional - defaults to gemini-2.5-flash)
SCHEMA_GENERATOR_MODEL=gemini-2.5-flash

# Rate limiting (optional - defaults shown)
SCHEMA_GENERATOR_MIN_DELAY=2.0
SCHEMA_GENERATOR_RATE_LIMIT_DELAY=5.0
```

## Why This Helps

1. **Correct Model**: `gemini-2.5-flash` is a real model with proper rate limits
2. **Longer Delays**: 2s between calls prevents hitting limits too quickly
3. **Better Retry**: 5s initial delay gives API time to recover from rate limits
4. **Flash Models**: Have higher rate limits than pro models

## Expected Behavior

- **Before**: Frequent `[WARN] Rate limit hit, waiting 1.0s before retry`
- **After**: Fewer rate limit hits, longer waits when they occur (5s, 10s, 20s)

The warnings you see are **normal** - they mean the code is handling rate limits automatically. With these fixes, you should see them less often.

## Testing

Run the schema generator and monitor:
- Should see `[INFO] Using model: gemini-2.5-flash` (or fallback)
- Should see `[INFO] Rate limiting: 2.0s minimum delay between requests`
- Rate limit warnings should be less frequent
- When they occur, waits should be longer (5s, 10s, 20s)
