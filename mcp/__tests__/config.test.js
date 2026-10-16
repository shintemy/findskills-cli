import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('reads only a valid fs-key from the read-only config path', async () => {
  const home = mkdtempSync(join(tmpdir(), 'findskills-config-'));
  const original = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  try {
    const { getApiKey } = await import(`../lib/config.js?${Date.now()}`);
    assert.equal(getApiKey(), null);
    const dir = join(home, '.findskills');
    mkdirSync(dir);
    writeFileSync(join(dir, 'config.json'), '{malformed');
    assert.equal(getApiKey(), null);
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ api_key: 'wrong-prefix' }));
    assert.equal(getApiKey(), null);
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ api_key: 'fs-key-valid' }));
    assert.equal(getApiKey(), 'fs-key-valid');
  } finally {
    if (original.HOME === undefined) delete process.env.HOME;
    else process.env.HOME = original.HOME;
    if (original.USERPROFILE === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = original.USERPROFILE;
    rmSync(home, { recursive: true, force: true });
  }
});
