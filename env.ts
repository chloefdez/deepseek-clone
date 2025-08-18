import "server-only";
import { z } from "zod";

const schema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, "Missing DEEPSEEK_API_KEY"),
  MONGODB_URI: z.string().min(1, "Missing MONGODB_URI"),
  CLERK_SECRET_KEY: z.string().min(1, "Missing CLERK_SECRET_KEY"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
});

export const env = schema.parse(process.env);