import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const DEV_JWT_SECRET = "dev-only-change-me-32chars!!";

const envSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().optional(),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_BUCKET: z.string().default("mneme-assets"),
  S3_ACCESS_KEY: z.string().default("mneme"),
  S3_SECRET_KEY: z.string().default("mneme_secret"),
  S3_REGION: z.string().default("us-east-1"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  EMAIL_PROVIDER: z.enum(["console", "postmark"]).default("console"),
  EMAIL_FROM: z.string().email().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const appEnv = parsed.data.APP_ENV;
const rawJwt = parsed.data.JWT_SECRET?.trim();

let jwtSecret: string;
if (appEnv === "development") {
  if (!rawJwt) {
    jwtSecret = DEV_JWT_SECRET;
  } else if (rawJwt.length < 16) {
    console.warn(
      `[config] JWT_SECRET is ${rawJwt.length} chars — using dev default. ` +
        "Remove JWT_SECRET from .env or set a 32+ char value for local dev."
    );
    jwtSecret = DEV_JWT_SECRET;
  } else {
    jwtSecret = rawJwt;
  }
} else {
  if (!rawJwt || rawJwt.length < 32) {
    console.error("JWT_SECRET is required in staging/production (min 32 characters).");
    process.exit(1);
  }
  if (rawJwt === DEV_JWT_SECRET) {
    console.error("JWT_SECRET must not use the development default in staging/production.");
    process.exit(1);
  }
  jwtSecret = rawJwt;
}

export const config = {
  env: appEnv,
  port: parsed.data.PORT,
  webUrl: parsed.data.WEB_URL,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwtSecret,
  isDev: appEnv === "development",
  s3: {
    endpoint: parsed.data.S3_ENDPOINT,
    bucket: parsed.data.S3_BUCKET,
    accessKey: parsed.data.S3_ACCESS_KEY,
    secretKey: parsed.data.S3_SECRET_KEY,
    region: parsed.data.S3_REGION,
    forcePathStyle: parsed.data.S3_FORCE_PATH_STYLE ?? true,
  },
  email: {
    provider: parsed.data.EMAIL_PROVIDER,
    from: parsed.data.EMAIL_FROM,
    postmarkToken: parsed.data.POSTMARK_SERVER_TOKEN,
  },
};
