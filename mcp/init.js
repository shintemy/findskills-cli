#!/usr/bin/env node

/**
 * findskills-mcp init
 *
 * One-command setup for Claude Code / Claude Desktop.
 * Resolves the nvm/PATH issue by:
 *   1. Installing findskills-mcp globally (persistent, not npx cache)
 *   2. Writing the absolute path into Claude's config
 *
 * Usage:  npx -y findskills-mcp init
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const PKG = 'findskills-mcp';
const SERVER_NAME = 'findskills';

// ── 1. Global install ──

console.log(`\n📦 Installing ${PKG} globally…`);
try {
  execSync(`npm install -g ${PKG}`, { stdio: 'inherit' });
} catch {
  console.error('\n❌ Global install failed. Try running: npm install -g findskills-mcp');
  process.exit(1);
}

// ── 2. Resolve absolute path to the global binary ──

const nodeDir = dirname(process.execPath);            // e.g. ~/.nvm/versions/node/v24/bin
const binPath = join(nodeDir, 'findskills-mcp');

if (!existsSync(binPath)) {
  console.error(`\n❌ Could not find global binary at ${binPath}`);
  console.error('Try: npm install -g findskills-mcp && which findskills-mcp');
  process.exit(1);
}

console.log(`✅ Binary: ${binPath}`);

// ── 3. Detect target: Claude Code or Claude Desktop ──

const claudeJsonPath = join(homedir(), '.claude.json');
const desktopConfigPath = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

let target = null;
let configPath = null;

if (existsSync(claudeJsonPath)) {
  target = 'code';
  configPath = claudeJsonPath;
} else if (existsSync(desktopConfigPath)) {
  target = 'desktop';
  configPath = desktopConfigPath;
}

if (!configPath) {
  // No existing config — create for Claude Code by default
  target = 'code';
  configPath = claudeJsonPath;
  console.log('ℹ️  No Claude config found. Creating Claude Code config.');
}

// ── 4. Write config ──

let config = {};
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch {
  // fresh config
}

if (!config.mcpServers) config.mcpServers = {};

config.mcpServers[SERVER_NAME] = {
  type: 'stdio',
  command: binPath,
  args: [],
  env: {},
};

writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

const targetLabel = target === 'code' ? 'Claude Code' : 'Claude Desktop';
console.log(`✅ Configured ${targetLabel}: ${configPath}`);

// ── Auth hand-off banner ──
// Intentionally NOT autorun — nested npx is flaky (cold cache, offline,
// proxy). Match the gh auth / stripe login / vercel login pattern: print
// the next command and let the user run it.
console.log('');
console.log('\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[1m  Next step: authenticate to get your API key\x1b[0m');
console.log('\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');
console.log('  Run:');
console.log('');
console.log('    \x1b[36mnpx findskills auth\x1b[0m');
console.log('');
console.log('  This will open your browser, sign you in with GitHub, and');
console.log('  provision a free API key (takes ~10 seconds).');
console.log('');
console.log(`  After auth succeeds, \x1b[1mrestart ${targetLabel}\x1b[0m to load`);
console.log('  the MCP server with your new key.');
console.log('');
