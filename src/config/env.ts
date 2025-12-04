import { config } from 'dotenv';
import z from 'zod';
config();

const envSchema = z.object({
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  AIRTABLE_API_KEY: z.string(),
  AGENTBOX_API_KEY: z.string(),
  AGENTBOX_CLIENT_ID: z.string(),
  ACCESS_TOKEN_HASH: z.string(),
});

export default envSchema.parse(process.env as z.infer<typeof envSchema>);
