import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import ts from 'typescript';

mkdirSync(new URL('../.sites-runtime/tests', import.meta.url), {recursive: true});

// Transpile auth module for Node execution
const authText = readFileSync(new URL('../lib/horizon/auth.ts', import.meta.url), 'utf8')
  .replace(/import\s+\{env\}\s+from\s+['"]@\/lib\/horizon\/env['"];?/, 'const env = { HORIZON_USERNAME: "zohair", HORIZON_PASSWORD: "veon12345" };');

const authTranspiled = ts.transpileModule(authText, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;

writeFileSync(new URL('../.sites-runtime/tests/auth.mjs', import.meta.url), authTranspiled);

const {
  getValidUsers,
  createSessionToken,
  verifySessionToken,
  getAuthenticatedUser,
  credentials,
  actor,
  TWELVE_HOURS_MS,
  TWELVE_HOURS_SECONDS,
} = await import('../.sites-runtime/tests/auth.mjs');

test('getValidUsers includes primary operator and hike accounts', () => {
  const users = getValidUsers();
  assert(users.length >= 2, 'Must have at least 2 valid accounts');
  
  const hike = users.find((u) => u.username === 'hike');
  assert(hike, 'hike account must exist');
  assert.equal(hike.password, 'hike123');

  const zohair = users.find((u) => u.username === 'zohair');
  assert(zohair, 'zohair account must exist');
  assert.equal(zohair.password, 'veon12345');
});

test('Session timeout is configured strictly to 12 hours (43,200s)', () => {
  assert.equal(TWELVE_HOURS_SECONDS, 12 * 60 * 60);
  assert.equal(TWELVE_HOURS_MS, 12 * 60 * 60 * 1000);
});

test('verifySessionToken authenticates hike:hike123 successfully', () => {
  const token = createSessionToken('hike', 'hike123');
  const user = verifySessionToken(token);
  assert(user, 'Session verification for hike must succeed');
  assert.equal(user.username, 'hike');
  assert.equal(user.role, 'Intelligence Analyst');
});

test('verifySessionToken authenticates zohair:veon12345 successfully', () => {
  const token = createSessionToken('zohair', 'veon12345');
  const user = verifySessionToken(token);
  assert(user, 'Session verification for zohair must succeed');
  assert.equal(user.username, 'zohair');
});

test('verifySessionToken rejects invalid password or unknown user', () => {
  const badPassToken = createSessionToken('hike', 'wrongpassword');
  assert.equal(verifySessionToken(badPassToken), null);

  const badUserToken = createSessionToken('intruder', 'hike123');
  assert.equal(verifySessionToken(badUserToken), null);
});

test('verifySessionToken rejects tokens older than 12 hours (session expiration)', () => {
  const now = Date.now();
  // Valid token created 1 hour ago
  const validToken = createSessionToken('hike', 'hike123', now - 3600000);
  assert(verifySessionToken(validToken), '1-hour old token should still be valid');

  // Expired token created 12.1 hours ago
  const expiredTime = now - (TWELVE_HOURS_MS + 60000);
  const expiredToken = createSessionToken('hike', 'hike123', expiredTime);
  assert.equal(verifySessionToken(expiredToken), null, 'Token older than 12 hours must be expired and rejected');
});

test('credentials verifies HTTP Basic and Cookie headers for hike and zohair', () => {
  // Test Basic auth for hike
  const basicReq = new Request('https://horizon.veon.com/api/test', {
    headers: {
      Authorization: `Basic ${btoa('hike:hike123')}`,
    },
  });
  assert.equal(credentials(basicReq, {}), true);
  assert.equal(actor(basicReq), 'hike');

  // Test Cookie auth for zohair
  const cookieToken = createSessionToken('zohair', 'veon12345');
  const cookieReq = new Request('https://horizon.veon.com/api/test', {
    headers: {
      Cookie: `horizon_session=${encodeURIComponent(cookieToken)}`,
    },
  });
  assert.equal(credentials(cookieReq, {}), true);
  assert.equal(actor(cookieReq), 'zohair');

  // Test Cookie auth for hike
  const hikeCookieToken = createSessionToken('hike', 'hike123');
  const hikeCookieReq = new Request('https://horizon.veon.com/api/test', {
    headers: {
      Cookie: `horizon_session=${encodeURIComponent(hikeCookieToken)}`,
    },
  });
  assert.equal(credentials(hikeCookieReq, {}), true);
  assert.equal(actor(hikeCookieReq), 'hike');
});
