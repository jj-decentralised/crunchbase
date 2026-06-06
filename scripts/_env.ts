/**
 * Loads .env / .env.local for standalone scripts (tsx) run outside Next.js.
 * Imported first by every script.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
