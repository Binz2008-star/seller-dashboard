import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Pool } from "pg";
import { env } from "@seller-dashboard/env/server";

import * as schema from "./schema/index";

// For Better Auth compatibility
export function createPgPool() {
  return new Pool({
    connectionString: env.DATABASE_URL,
  });
}

// For Drizzle ORM usage
export function createDb() {
  const client = postgres(env.DATABASE_URL, {
    prepare: false,
  });

  return drizzle(client, { schema });
}

export const db = createDb();
export const pgPool = createPgPool();
