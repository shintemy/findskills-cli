import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { buildAuthErrorMessage } from './lib/auth-error.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const UA = `${pkg.name}/${pkg.version}`;

const BASE = `${process.env.FINDSKILLS_BASE_URL || 'https://findskills.org'}/api/v1`;
const MAX_RETRIES = 2;
const MAX_QUERY_LENGTH = 200;

let _apiKey = null;

/**
 * Set the API key for authenticated requests.
 * Called once at startup from cli.js if a key is configured.
 */
export function setApiKey(key) {
  _apiKey = key;
}

async function request(path) {
  const url = `${BASE}${path}`;
  const headers = { 'User-Agent': UA, 'X-Client-Source': 'mcp', 'Accept': 'application/json' };
  if (_apiKey) {
    headers['Authorization'] = `Bearer ${_apiKey}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { redirect: 'follow', headers });

    if (res.status === 429) {
      if (attempt === MAX_RETRIES) {
        let msg = 'Rate limit exceeded. Please try again in a minute.';
        try {
          const body = await res.json();
          if (body.hint) msg += ` ${body.hint}`;
        } catch {}
        throw new Error(msg);
      }
      const retryAfter = Number(res.headers.get('retry-after')) || 5;
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (res.status === 401) {
      const body = await res.json().catch(() => null);
      throw new Error(buildAuthErrorMessage(body, res.status, res.statusText));
    }

    if (!res.ok) throw new Error(`FindSkills API error: ${res.status} ${res.statusText}`);
    return res.json();
  }
}

function validateQuery(query) {
  if (typeof query === 'string' && query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long (${query.length} chars). Maximum is ${MAX_QUERY_LENGTH} characters.`);
  }
}

export async function searchSkills(query, limit = 20, sort) {
  validateQuery(query);
  let path = `/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (sort) path += `&sort=${encodeURIComponent(sort)}`;
  return request(path);
}

export async function listSkills({ category, source, auth_type, sort, min_quality, min_safety, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (category) params.set('category', category);
  if (source) params.set('source', source);
  if (auth_type) params.set('auth_type', auth_type);
  if (sort) params.set('sort', sort);
  if (min_quality != null) params.set('min_quality', String(min_quality));
  if (min_safety != null) params.set('min_safety', String(min_safety));
  return request(`/skills?${params}`);
}

export async function getSkill(id) {
  return request(`/skills/${encodeURIComponent(id)}`);
}

export async function getStats() {
  return request('/stats');
}

export async function listTags(limit = 50) {
  return request(`/tags?limit=${limit}`);
}
