import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

it('the installed npm tarball initializes and exposes MCP tools', { timeout: 120_000 }, async () => {
  const workdir = mkdtempSync(join(tmpdir(), 'findskills-package-'));
  const home = join(workdir, 'home');
  mkdirSync(home);
  const configDir = join(home, '.findskills');
  mkdirSync(configDir);
  writeFileSync(join(configDir, 'config.json'), JSON.stringify({ api_key: 'fs-key-package-test' }));
  const fixture = join(workdir, 'fetch-fixture.mjs');
  const callsFile = join(workdir, 'fetch-calls.json');
  writeFileSync(fixture, `import { appendFileSync } from 'node:fs';\nglobalThis.fetch = async (url, options = {}) => { if (String(url).includes('/api/v1/')) appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify({ url: String(url), headers: Object.fromEntries(new Headers(options.headers).entries()) }) + '\\n'); return new Response(JSON.stringify({ skills: [{ id: 'fixture-skill' }], total: 1 }), { status: 200, headers: { 'content-type': 'application/json', 'x-auth-status': 'valid-key' } }); };\n`);
  const testEnv = { ...process.env, HOME: home, USERPROFILE: home, FINDSKILLS_BASE_URL: 'https://fixture.invalid', NODE_OPTIONS: `--import=${fixture}` };
  const client = new Client({ name: 'package-test', version: '1.0.0' });
  let stderr = '';
  try {
    // Override to reproduce a released artifact, e.g. findskills-mcp@0.1.25.
    const spec = process.env.FINDSKILLS_PACKAGE_SPEC || packageRoot;
    const [packed] = JSON.parse(execFileSync(npm, [
      'pack', spec, '--ignore-scripts', '--json', '--pack-destination', workdir,
    ], { cwd: packageRoot, encoding: 'utf8', timeout: 30_000, env: testEnv }));
    execFileSync(npm, [
      'install', join(workdir, packed.filename), '--ignore-scripts',
      '--no-audit', '--no-fund', '--package-lock=false',
    ], { cwd: workdir, stdio: 'pipe', timeout: 60_000, env: testEnv });

    const installedRoot = join(workdir, 'node_modules', 'findskills-mcp');
    const pkg = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(installedRoot, pkg.bin['findskills-mcp'])],
      cwd: workdir,
      stderr: 'pipe',
      env: testEnv,
    });
    transport.stderr.on('data', chunk => { stderr += chunk.toString(); });
    await client.connect(transport, { timeout: 10_000 });
    const { tools } = await client.listTools();
    assert.ok(tools.some(tool => tool.name === 'search_skills'));
    const search = await client.callTool({ name: 'search_skills', arguments: { query: 'fixture' } });
    assert.match(search.content[0].text, /fixture-skill/);
    const requests = readFileSync(callsFile, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(requests.map(request => request.headers.authorization), ['Bearer fs-key-package-test', 'Bearer fs-key-package-test']);
    assert.ok(requests.some(request => request.headers['x-client-source'] === 'mcp'));
  } catch (error) {
    throw new Error(`${error.message}\nServer stderr:\n${stderr}`, { cause: error });
  } finally {
    await client.close();
    rmSync(workdir, { recursive: true, force: true });
  }
});
