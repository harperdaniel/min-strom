import { PostgresUserRepository, runUserMigrations } from "@minstrom/database";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

async function main(): Promise<void> {
  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set before the API server can start.");
  }

  await runUserMigrations(config.DATABASE_URL);

  const app = createApp(config, {
    users: new PostgresUserRepository(config.DATABASE_URL)
  });

  app.listen(config.API_PORT, () => {
    console.log(`Minstrøm API listening on http://localhost:${config.API_PORT}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
