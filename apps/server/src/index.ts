import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { serve } from "@hono/node-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", "..", ".env") });
dotenv.config();

import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@seller-dashboard/api/context";
import { appRouter } from "@seller-dashboard/api/routers/index";
import { auth } from "@seller-dashboard/auth";
import { env } from "@seller-dashboard/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => c.text("OK"));

const port = Number(env.PORT || 3000);

console.log(`🚀 Server starting on http://localhost:${port}`);

try {
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`✅ Server listening on http://localhost:${port}`);
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

export default {
  port,
  fetch: app.fetch,
};
