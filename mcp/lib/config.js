import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Read the CLI's stored API key without creating or changing local files. */
export function getApiKey() {
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.findskills', 'config.json'), 'utf8'));
    const key = config?.api_key;
    return typeof key === 'string' && key.startsWith('fs-key-') ? key : null;
  } catch {
    return null;
  }
}
