import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch globally before importing api module
const calls = [];
const mockResponses = {};

function setMockResponse(urlPattern, body) {
  mockResponses[urlPattern] = body;
}

const originalFetch = globalThis.fetch;

function installMock() {
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: url.toString(), opts });
    for (const [pattern, body] of Object.entries(mockResponses)) {
      if (url.toString().includes(pattern)) {
        return { ok: true, json: async () => body };
      }
    }
    return { ok: false, status: 404, statusText: 'Not Found' };
  };
}

function uninstallMock() {
  globalThis.fetch = originalFetch;
}

describe('api client', { concurrency: 1 }, () => {
  let api;

  beforeEach(async () => {
    calls.length = 0;
    Object.keys(mockResponses).forEach(k => delete mockResponses[k]);
    installMock();
    // Dynamic import to pick up mocked fetch
    api = await import(`../api.js?t=${Date.now()}`);
  });

  afterEach(() => {
    uninstallMock();
  });

  it('searchSkills calls correct URL', async () => {
    setMockResponse('/search', { skills: [{ name: 'test-skill' }], total: 1 });
    const data = await api.searchSkills('web scraping', 5);
    assert.equal(data.total, 1);
    assert.equal(data.skills[0].name, 'test-skill');
    assert.ok(calls[0].url.includes('/search?q=web%20scraping&limit=5'));
    assert.equal(calls[0].opts.headers['X-Client-Source'], 'mcp');
    assert.equal(calls[0].opts.headers.Authorization, undefined);
  });

  it('sends the configured key as a bearer token', async () => {
    setMockResponse('/search', { skills: [], total: 0 });
    api.setApiKey('fs-key-test');
    await api.searchSkills('test');
    assert.equal(calls[0].opts.headers.Authorization, 'Bearer fs-key-test');
    api.setApiKey(null);
  });

  it('listSkills builds query params correctly', async () => {
    setMockResponse('/skills', { skills: [], total: 0, limit: 3, offset: 0 });
    await api.listSkills({ category: 'coding', sort: 'stars', limit: 3 });
    const url = calls[0].url;
    assert.ok(url.includes('category=coding'));
    assert.ok(url.includes('sort=stars'));
    assert.ok(url.includes('limit=3'));
  });

  it('listSkills passes min_safety and min_quality', async () => {
    setMockResponse('/skills', { skills: [], total: 0 });
    await api.listSkills({ min_safety: 70, min_quality: 50 });
    const url = calls[0].url;
    assert.ok(url.includes('min_safety=70'));
    assert.ok(url.includes('min_quality=50'));
  });

  it('listSkills omits undefined optional params', async () => {
    setMockResponse('/skills', { skills: [], total: 0 });
    await api.listSkills({ limit: 10 });
    const url = calls[0].url;
    assert.ok(!url.includes('category='));
    assert.ok(!url.includes('source='));
    assert.ok(!url.includes('min_safety='));
  });

  it('getSkill encodes ID', async () => {
    setMockResponse('/skills/', { id: 'foo/bar', name: 'Test' });
    await api.getSkill('foo/bar');
    assert.ok(calls[0].url.includes('/skills/foo%2Fbar'));
  });

  it('getStats calls /stats', async () => {
    setMockResponse('/stats', { total_skills: 15000 });
    const data = await api.getStats();
    assert.equal(data.total_skills, 15000);
  });

  it('listTags passes limit', async () => {
    setMockResponse('/tags', { tags: [{ name: 'mcp', count: 42 }] });
    const data = await api.listTags(10);
    assert.ok(calls[0].url.includes('limit=10'));
    assert.equal(data.tags[0].name, 'mcp');
  });

  it('throws on non-ok response', async () => {
    // No mock set, so 404
    await assert.rejects(() => api.searchSkills('test'), /FindSkills API error: 404/);
  });

  it('includes API-provided guidance and sign-in URL for 401 responses', async () => {
    globalThis.fetch = async () => ({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Authentication required', signin_url: 'https://findskills.org/signin' }),
    });
    await assert.rejects(
      () => api.searchSkills('test'),
      /Authentication required\n\n  → https:\/\/findskills\.org\/signin/,
    );
  });

  it('uses the fallback message for a 401 with no message or invalid JSON', async () => {
    globalThis.fetch = async () => ({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: async () => ({}),
    });
    await assert.rejects(() => api.searchSkills('test'), /Authentication required \(HTTP 401\)/);

    globalThis.fetch = async () => ({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: async () => { throw new SyntaxError('invalid JSON'); },
    });
    await assert.rejects(() => api.searchSkills('test'), /Authentication required \(HTTP 401\)/);
  });
});
