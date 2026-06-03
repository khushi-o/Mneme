import rateLimit from "express-rate-limit";

export const magicLinkRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      type: "about:blank",
      title: "Too many sign-in requests. Try again later.",
      status: 429,
      code: "RATE_LIMITED",
    });
  },
});
