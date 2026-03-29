import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Lazy-init so Next.js static builds don't crash when DATABASE_URL is absent
let _db: NeonHttpDatabase<typeof schema> | null = null;

export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop: string | symbol) {
      if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new Error(
            "DATABASE_URL is not set — cannot initialise database connection",
          );
        }
        _db = drizzle(neon(url), { schema });
      }
      return Reflect.get(_db, prop);
    },
  },
);
