# findskills-mcp

MCP Server for [FindSkills](https://findskills.org) — search and discover 93,000+ AI Agent Skills via the [Model Context Protocol](https://modelcontextprotocol.io).

## Quick Start

### One-command setup (recommended)

```bash
npx -y findskills-mcp init
```

This installs globally, detects your Node path, and writes the config for Claude Code or Claude Desktop automatically. Works with nvm, fnm, volta, and system Node.

### Manual setup

<details>
<summary>Claude Code</summary>

```bash
claude mcp add findskills -- npx -y findskills-mcp
```
</details>

<details>
<summary>Claude Desktop</summary>

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "findskills": {
      "command": "npx",
      "args": ["-y", "findskills-mcp"]
    }
  }
}
```
</details>

<details>
<summary>Other MCP Clients</summary>

```bash
npx findskills-mcp
```

The server communicates over stdio using the MCP protocol.
</details>

## Tools

| Tool | Description |
|------|-------------|
| `search_skills` | Search by keyword, ranked by relevance |
| `list_skills` | Browse/filter by category, source, safety, quality |
| `get_skill` | Full details for a specific skill |
| `get_stats` | Dataset overview (total count, distributions) |
| `list_tags` | All tags with usage counts |

### search_skills

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | Search keyword |
| `limit` | number | no | Max results (default 20, max 100) |

### list_skills

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | enum | no | One of: search, coding, data, communication, media, automation, security, ai-ml, devops, finance, productivity, integration, other |
| `source` | enum | no | clawhub, github, manual |
| `auth_type` | enum | no | none, api_key, oauth2, bearer |
| `sort` | enum | no | updated, added, stars, quality, safety, name |
| `min_quality` | number | no | Minimum quality score (0-100) |
| `min_safety` | number | no | Minimum safety score (0-100) |
| `limit` | number | no | Results per page (default 20) |
| `offset` | number | no | Pagination offset |

### get_skill

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Skill ID |

### get_stats

No parameters.

### list_tags

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | no | Max tags (default 50) |

## Troubleshooting

**Claude Code can't find `npx` (nvm/fnm/volta users)**

Node version managers don't inject PATH into non-interactive processes like Claude Code. Run the one-command setup instead:

```bash
npx -y findskills-mcp init
```

Or manually use the full path:

```bash
claude mcp add findskills -- $(which npx) -y findskills-mcp
```

## Requirements

- Node.js >= 20.0.0

## License

MIT
