import { createPgPool } from "@seller-dashboard/db";
import { env } from "@seller-dashboard/env/server";
import { betterAuth } from "better-auth";

export function createAuth() {
  const db = createPgPool();

  return betterAuth({
    database: db,
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export const auth = createAuth();
