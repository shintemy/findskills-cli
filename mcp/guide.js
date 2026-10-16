import { createInterface } from 'node:readline/promises';
import { checkLatestVersion, currentVersion } from './version-check.js';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

export async function runInteractiveGuide() {
  const version = currentVersion();

  console.log(`\n${BOLD}📦 FindSkills MCP Server${RESET} ${DIM}v${version}${RESET}`);
  console.log();
  console.log('You ran this directly in a terminal. This is a stdio MCP server —');
  console.log('it needs an AI client (Claude Code / Desktop / Cursor) to talk to it.');
  console.log();

  // Version check in parallel with showing the guide
  const versionPromise = checkLatestVersion();

  console.log(`${CYAN}What I can do for you:${RESET}`);
  console.log('  • Install findskills-mcp globally (pinned binary, avoids npx cache issues)');
  console.log('  • Write the absolute path into your Claude Code / Desktop config');
  console.log(`  • After restart, just ask: ${DIM}"用 findskills 搜索 web scraping"${RESET}`);
  console.log();

  await versionPromise;

  let rl;
  try {
    rl = createInterface({ input: process.stdin, output: process.stdout });
    const ans = (await rl.question(`${BOLD}Configure now?${RESET} [Y/n] `)).trim().toLowerCase();
    rl.close();

    if (ans === '' || ans === 'y' || ans === 'yes') {
      await import('./init.js');
    } else {
      console.log();
      console.log(`${DIM}Skipped. Run \`npx findskills-mcp init\` when you're ready.${RESET}`);
      console.log(`${DIM}Docs: https://findskills.org/developers${RESET}`);
      console.log();
    }
  } catch (err) {
    // User hit Ctrl+C or readline failed — exit cleanly
    if (rl) rl.close();
    if (err?.code !== 'ERR_USE_AFTER_CLOSE' && err?.name !== 'AbortError') {
      // Unexpected — surface it
      console.error(`\n${YELLOW}Guide interrupted:${RESET} ${err.message}`);
    }
    process.exit(0);
  }
}
