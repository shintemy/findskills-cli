/** Format actionable guidance returned with an authentication failure. */
export function buildAuthErrorMessage(body, status, { dim = '', reset = '' } = {}) {
  if (!body || typeof body !== 'object') return `Authentication required (HTTP ${status})`;
  const message = typeof body.message === 'string' && body.message.length > 0 ? body.message : null;
  if (!message) return `Authentication required (HTTP ${status})`;
  const url = body.signin_url || body.developers_url || null;
  if (!url) return message;
  return `${message}\n\n  ${dim}→ ${url}${reset}`;
}
