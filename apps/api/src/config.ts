import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16).default("dev-only-change-me-32chars!!"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsed.data.APP_ENV,
  port: parsed.data.PORT,
  webUrl: parsed.data.WEB_URL,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  isDev: parsed.data.APP_ENV === "development",
};
