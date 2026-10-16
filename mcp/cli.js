#!/usr/bin/env node
const arg = process.argv[2];

if (arg === 'init') {
  await import('./init.js');
} else if (arg === '--version' || arg === '-v') {
  const { currentVersion } = await import('./version-check.js');
  console.log(currentVersion());
  process.exit(0);
} else if (arg !== '--stdio' && process.stdin.isTTY && process.stdout.isTTY) {
  // Interactive terminal — show guide instead of silently waiting on stdio.
  // --stdio forces raw MCP mode even in a TTY (for protocol testing).
  const { runInteractiveGuide } = await import('./guide.js');
  await runInteractiveGuide();
} else {
  // Non-TTY (spawned by MCP client) or --stdio: normal MCP server.
  const { startServer } = await import('./server.js');
  await startServer();

  // Fire-and-forget version check — logs to stderr if outdated, never blocks MCP.
  import('./version-check.js').then(m => m.checkLatestVersion()).catch(() => {});
}
