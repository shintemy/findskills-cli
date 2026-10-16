import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { searchSkills, listSkills, getSkill, getStats, listTags } from './api.js';
import { setApiKey } from './api.js';
import { getApiKey } from './lib/config.js';

function text(content) {
  return { content: [{ type: 'text', text: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }] };
}

function error(err) {
  return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
}

export function createServer() {
  const server = new McpServer({ name: 'findskills', version: '0.1.0' });

  server.registerTool('search_skills', {
    title: 'Search Skills',
    description: 'Search FindSkills directory by keyword. Supports sort parameter to re-order results (e.g. sort=quality for highest quality first). Response includes "total" (all matches) and "showing" (returned count). When "fallback" === "loose-match", strict matching returned 0 and results are related-only (ranked by relevance, capped at 10) — tell the user "没有完全匹配，以下是相关 skill" / "no exact match — showing related skills" before presenting results.',
    inputSchema: {
      query: z.string().describe('Search keyword (e.g. "web scraping", "slack", "database")'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max results (default 20)'),
      sort: z.enum(['relevance', 'quality', 'safety', 'stars', 'name', 'added', 'updated']).default('relevance').describe('Sort order (default: relevance)'),
    },
  }, async ({ query, limit, sort }) => {
    try {
      const data = await searchSkills(query, limit, sort === 'relevance' ? undefined : sort);
      // API returns { skills, total, limit, offset, fallback? } — total is all matches,
      // skills is top N. `fallback: 'loose-match'` signals strict AND returned 0 and
      // the server fell back to OR+rank top-10. Forward the flag so Claude can frame
      // the response honestly ("no exact match, these are related").
      const total = data.total ?? 0;
      const results = data.skills ?? data.results ?? data;
      const count = Array.isArray(results) ? results.length : 0;
      return text({
        total,
        showing: count,
        ...(data.fallback ? { fallback: data.fallback } : {}),
        results,
      });
    }
    catch (err) { return error(err); }
  });

  server.registerTool('list_skills', {
    title: 'List Skills',
    description: 'Browse and filter skills by category, source, safety tier, and more. Supports pagination.',
    inputSchema: {
      category: z.enum(['search', 'coding', 'data', 'communication', 'media', 'automation', 'security', 'ai-ml', 'devops', 'finance', 'productivity', 'integration', 'other']).optional().describe('Filter by category'),
      source: z.enum(['clawhub', 'github', 'smithery', 'manual']).optional().describe('Filter by data source'),
      auth_type: z.enum(['none', 'api_key', 'oauth2', 'bearer']).optional().describe('Filter by auth requirement'),
      sort: z.enum(['updated', 'added', 'stars', 'quality', 'safety', 'name']).default('updated').describe('Sort order'),
      min_quality: z.number().int().min(0).max(100).optional().describe('Minimum quality score (0-100)'),
      min_safety: z.number().int().min(0).max(100).optional().describe('Minimum safety score (0-100)'),
      limit: z.number().int().min(1).max(100).default(20).describe('Results per page'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
  }, async (params) => {
    try { return text(await listSkills(params)); }
    catch (err) { return error(err); }
  });

  server.registerTool('get_skill', {
    title: 'Get Skill Details',
    description: 'Get full details for a specific skill. Pass the `id` field from a previous `search_skills` or `list_skills` result — NOT the human-readable name.',
    inputSchema: {
      id: z.string().describe('Skill ID from search_skills/list_skills results (the `id` field, e.g. "clawhub-web-search"). Not the skill name.'),
    },
  }, async ({ id }) => {
    try { return text(await getSkill(id)); }
    catch (err) {
      if (/\b404\b/.test(err.message)) {
        return error(new Error(`Skill id "${id}" not found. Make sure you pass the \`id\` field (e.g. "clawhub-web-search") from search_skills results, not the display name.`));
      }
      return error(err);
    }
  });

  server.registerTool('get_stats', {
    title: 'Get Dataset Stats',
    description: 'Get FindSkills dataset overview: total skill count, category/source/auth breakdowns, quality and safety distributions. Call this first to understand the dataset.',
    inputSchema: {},
  }, async () => {
    try { return text(await getStats()); }
    catch (err) { return error(err); }
  });

  server.registerTool('list_tags', {
    title: 'List Tags',
    description: 'List all skill tags with usage counts, sorted by popularity.',
    inputSchema: {
      limit: z.number().int().min(1).max(500).default(50).describe('Max tags to return'),
    },
  }, async ({ limit }) => {
    try { return text(await listTags(limit)); }
    catch (err) { return error(err); }
  });

  return server;
}

// ── Startup banner + auth self-check helpers ──
// Stdout is the MCP protocol channel — all diagnostic output goes to stderr.

function readPkgVersion() {
  try {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version || '0.0.0';
  } catch { return '0.0.0'; }
}

/**
 * Probe /api/v1/stats once with the stored key, translate X-Auth-Status into a
 * human message on stderr. Fire-and-forget — must never block server.connect()
 * because Claude Desktop times out MCP handshakes on slow network.
 */
async function runAuthSelfCheck(apiKey, version) {
  const base = process.env.FINDSKILLS_BASE_URL || 'https://findskills.org';
  try {
    const res = await fetch(`${base}/api/v1/stats`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        'user-agent': `findskills-mcp/${version}`,
      },
    });
    const authStatus = res.headers.get('x-auth-status');
    if (authStatus === 'valid-key') {
      process.stderr.write(`[findskills-mcp] ✓ Authenticated (tier: developer)\n`);
    } else if (authStatus === 'invalid-key') {
      process.stderr.write(`[findskills-mcp] ⚠ Stored API key is invalid. Run \`npx findskills auth\` to re-authenticate.\n`);
    } else {
      process.stderr.write(`[findskills-mcp] ⚠ Auth status unclear (X-Auth-Status=${authStatus || 'missing'}).\n`);
    }
  } catch (err) {
    process.stderr.write(`[findskills-mcp] ⚠ Could not reach server for auth self-check: ${err.message}\n`);
  }
}

export async function startServer() {
  const version = readPkgVersion();
  process.stderr.write(`[findskills-mcp] v${version} starting\n`);

  const apiKey = getApiKey();
  if (!apiKey) {
    process.stderr.write(`[findskills-mcp] ⚠ No API key. Run \`npx findskills auth\` to authenticate.\n`);
    process.stderr.write(`[findskills-mcp] Server will start but tool calls will fail with 401.\n`);
  } else {
    setApiKey(apiKey);
    // Fire-and-forget: don't block MCP handshake on network RTT.
    runAuthSelfCheck(apiKey, version).catch(() => {});
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FindSkills MCP Server running on stdio');
}
