# Rate Limiting Guide for Question Generation

## Overview

The question generator now includes built-in rate limiting to help you avoid hitting API limits. This guide explains how to configure and optimize rate limiting for your API tier.

## Features

### 1. **Automatic Rate Limit Detection**
- Detects 429 (Rate Limit) errors automatically
- Distinguishes rate limits from other transient errors
- Provides clear error messages when limits are hit

### 2. **Adaptive Backoff**
- Automatically increases delay when rate limits are detected
- Gradually reduces delay when calls succeed
- Prevents rapid retry storms

### 3. **Minimum Delay Between Calls**
- Ensures a minimum delay between all API calls
- Prevents burst requests that trigger rate limits
- Thread-safe for concurrent workers

### 4. **Configurable Delays**
- Set via environment variables
- Adjust based on your API tier limits
- Different settings for normal vs. rate-limited scenarios

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Minimum delay between API calls (seconds)
# Recommended: 0.5-1.0 for free tier, 0.1-0.3 for paid tier
API_MIN_DELAY=0.5

# Initial delay when rate limit is hit (seconds)
# Will increase automatically if rate limits persist
API_RATE_LIMIT_DELAY=5.0

# Number of concurrent workers (reduce if hitting limits)
MAX_WORKERS=4
```

### Recommended Settings by API Tier

#### Free Tier (60 requests/minute)
```bash
API_MIN_DELAY=1.0          # 1 second = 60 requests/minute max
API_RATE_LIMIT_DELAY=10.0  # Wait 10s on rate limit
MAX_WORKERS=2              # Lower concurrency
```

#### Paid Tier (Higher limits)
```bash
API_MIN_DELAY=0.2          # 0.2 seconds = 300 requests/minute
API_RATE_LIMIT_DELAY=5.0   # Wait 5s on rate limit
MAX_WORKERS=4-8            # Higher concurrency
```

## How It Works

### Normal Operation
1. Each API call waits at least `API_MIN_DELAY` seconds since the last call
2. This prevents burst requests that trigger rate limits
3. Works across all concurrent workers (thread-safe)

### Rate Limit Detection
1. When a 429 error is detected:
   - Current delay is increased by 50% (capped at 60s)
   - System waits the increased delay before retrying
   - Rate limit counter is incremented

2. On successful calls:
   - Rate limit counter resets
   - Delay gradually decreases (by 10% each success)
   - Returns to `API_MIN_DELAY` over time

### Example Flow

```
Call 1: Success → Wait 0.5s → Call 2
Call 2: Success → Wait 0.5s → Call 3
Call 3: Rate Limit (429) → Wait 5.0s → Retry
Call 4: Success → Wait 5.0s → Call 5 (delay gradually reduces)
...
After 10 successes: Delay back to ~0.5s
```

## Reducing Workers

If you're still hitting rate limits, reduce the number of concurrent workers:

```bash
# In your generation command or .env.local
MAX_WORKERS=2  # Instead of 4 or 8
```

This reduces parallel API calls, which helps stay within rate limits.

## Monitoring

The system logs rate limit events:
```
[DEBUG] ⚠ Rate limit detected (count: 1), waiting 5.0 seconds...
[DEBUG] ⚠ Rate limit detected (count: 2), waiting 7.5 seconds...
```

Watch for these messages to understand your rate limit frequency.

## Best Practices

1. **Start Conservative**: Begin with higher delays and reduce if no rate limits occur
2. **Monitor Logs**: Watch for rate limit messages to adjust settings
3. **Reduce Workers First**: If hitting limits, reduce `MAX_WORKERS` before increasing delays
4. **Batch Generation**: Generate questions in smaller batches with breaks between batches
5. **Use Off-Peak Hours**: Generate during off-peak hours for better rate limit headroom

## Troubleshooting

### Still Hitting Rate Limits?

1. **Increase `API_MIN_DELAY`**: Try 1.0 or 2.0 seconds
2. **Reduce `MAX_WORKERS`**: Try 1 or 2 workers
3. **Check Your API Tier**: Verify your actual rate limits
4. **Generate in Batches**: Run smaller batches with breaks

### Too Slow?

1. **Reduce `API_MIN_DELAY`**: Try 0.2 or 0.3 seconds (if your tier allows)
2. **Increase `MAX_WORKERS`**: Try 4-8 workers (if not hitting limits)
3. **Monitor Rate Limits**: If no rate limits occur, you can be more aggressive

## Advanced: Custom Rate Limiting

For more control, you can modify the `LLMClient` class directly:

```python
# In project.py, modify LLMClient.__init__
llm = LLMClient(
    api_key=api_key,
    min_delay=0.3,           # Custom minimum delay
    rate_limit_delay=8.0     # Custom rate limit delay
)
```

## Summary

- ✅ **Automatic rate limit detection** - No manual intervention needed
- ✅ **Adaptive backoff** - Automatically adjusts to your API tier
- ✅ **Configurable delays** - Tune via environment variables
- ✅ **Thread-safe** - Works with concurrent workers
- ✅ **Gradual recovery** - Returns to normal speed after rate limits

The system is designed to automatically handle rate limits while maximizing throughput within your API tier's limits.






