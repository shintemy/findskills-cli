import { it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthErrorMessage } from '../lib/auth-error.js';

it('provides safe guidance for missing or malformed 401 bodies', () => {
  assert.deepEqual([
    buildAuthErrorMessage(null, 401),
    buildAuthErrorMessage({}, 401),
    buildAuthErrorMessage({ message: 'Sign in', signin_url: 'https://example.test/signin' }, 401),
  ], [
    'Authentication required (HTTP 401)',
    'Authentication required (HTTP 401)',
    'Sign in\n\n  → https://example.test/signin',
  ]);
});
