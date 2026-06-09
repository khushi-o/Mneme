import rateLimit from "express-rate-limit";

const rateLimitBody = (title: string) => ({
  type: "about:blank" as const,
  title,
  status: 429,
  code: "RATE_LIMITED" as const,
});

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(rateLimitBody("Too many requests. Try again later."));
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(rateLimitBody("Too many auth requests. Try again later."));
  },
});

export const magicLinkRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(rateLimitBody("Too many sign-in requests. Try again later."));
  },
});
