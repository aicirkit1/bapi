import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal .env loader so the app stays dependency-free.
 * Loads KEY=VALUE pairs from <cwd>/.env into process.env without overriding
 * variables already set in the environment.
 */
export function loadEnv(): void {
  const path = join(process.cwd(), '.env');
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, 'utf-8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
