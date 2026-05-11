const buckets = new Map();

export function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.actor?.id ?? 'anonymous'}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > max) {
      res.status(429).json({
        requestId: req.requestId,
        error: 'RateLimitExceeded',
        message: 'Request rate exceeds configured enterprise API limit.'
      });
      return;
    }
    next();
  };
}

