import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin.js');

let nextId = 1;

function sendRequest(proc, method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === id) {
            proc.stdout.removeListener('data', onData);
            resolve(parsed);
            return;
          }
        } catch {}
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { proc.stdout.removeListener('data', onData); reject(new Error('timeout')); }, 10000);
  });
}

async function startMcpServer() {
  const home = mkdtempSync(join(tmpdir(), 'findskills-server-test-'));
  const proc = spawn('node', [BIN], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, HOME: home, USERPROFILE: home } });
  proc.once('exit', () => rmSync(home, { recursive: true, force: true }));
  const initRes = await sendRequest(proc, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.1.0' },
  });
  assert.ok(initRes.result);
  assert.equal(initRes.result.serverInfo.name, 'findskills');
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  return proc;
}

describe('MCP server', { concurrency: 1 }, () => {
  it('initializes with correct server info', async () => {
    const proc = await startMcpServer();
    try {
      // Already verified in startMcpServer
      assert.ok(true);
    } finally {
      proc.kill();
    }
  });

  it('lists all 5 tools with correct names', async () => {
    const proc = await startMcpServer();
    try {
      const res = await sendRequest(proc, 'tools/list');
      const names = res.result.tools.map(t => t.name).sort();
      assert.deepEqual(names, ['get_skill', 'get_stats', 'list_skills', 'list_tags', 'search_skills']);
    } finally {
      proc.kill();
    }
  });

  it('each tool has description and inputSchema', async () => {
    const proc = await startMcpServer();
    try {
      const res = await sendRequest(proc, 'tools/list');
      for (const tool of res.result.tools) {
        assert.ok(tool.description, `${tool.name} missing description`);
        assert.ok(tool.inputSchema, `${tool.name} missing inputSchema`);
      }
    } finally {
      proc.kill();
    }
  });

  it('search_skills requires query parameter', async () => {
    const proc = await startMcpServer();
    try {
      const res = await sendRequest(proc, 'tools/list');
      const searchTool = res.result.tools.find(t => t.name === 'search_skills');
      assert.ok(searchTool.inputSchema.required.includes('query'));
    } finally {
      proc.kill();
    }
  });

  it('get_skill requires id parameter', async () => {
    const proc = await startMcpServer();
    try {
      const res = await sendRequest(proc, 'tools/list');
      const getTool = res.result.tools.find(t => t.name === 'get_skill');
      assert.ok(getTool.inputSchema.required.includes('id'));
    } finally {
      proc.kill();
    }
  });

  it('list_skills has category enum with 13 values', async () => {
    const proc = await startMcpServer();
    try {
      const res = await sendRequest(proc, 'tools/list');
      const listTool = res.result.tools.find(t => t.name === 'list_skills');
      const catProp = listTool.inputSchema.properties.category;
      assert.ok(catProp);
      assert.equal(catProp.enum.length, 13);
    } finally {
      proc.kill();
    }
  });
});
