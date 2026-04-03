import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const portSchema = z
  .string()
  .default("3000")
  .refine((value) => /^\d+$/.test(value), "PORT must be a valid integer")
  .transform(Number)
  .refine((value) => value > 0 && value <= 65535, "PORT must be between 1 and 65535");

const databaseUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("postgresql://") ||
      value.startsWith("postgres://"),
    "DATABASE_URL must be a PostgreSQL connection string",
  );

export const env = createEnv({
  server: {
    PORT: portSchema,
    DATABASE_URL: databaseUrlSchema,
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.string().url().optional().or(z.literal("http://localhost:3000")),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ADMIN_SEED_TOKEN: z.string().min(1).optional(),
    REDIS_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

if (env.NODE_ENV === "production") {
  if (!env.BETTER_AUTH_URL.startsWith("https://")) {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }

  if (!env.CORS_ORIGIN.startsWith("https://")) {
    throw new Error("CORS_ORIGIN must use HTTPS in production");
  }
}
