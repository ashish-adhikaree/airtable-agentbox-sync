import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: './src/db/local.db',
  },
  out: './src/db/migrations',
});
