const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const section = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));
function setup(fetch) {
  const fields = {
    '#siteAuthEmail': {value: 'qa@example.invalid'},
    '#siteAuthPassword': {value: 'local-test-only'},
    '#siteAuthSubmit': {disabled: false, textContent: '로그인'},
    '#siteAdminLink': {hidden: true},
  };
  const context = vm.createContext({
    fetch, AbortController, setTimeout, clearTimeout, encodeURIComponent,
    fields, alerts: [], siteAuthMode: 'login', currentUser: null,
    accessToken: null, isAdminUser: false, rendered: false, closed: false,
    $: selector => fields[selector], getUrl: () => 'https://example.invalid',
    getKey: () => 'public-test-key', authHeaders: () => ({}),
    alert(message) {context.alerts.push(message)},
    saveAuthSession(data) {context.accessToken = data.access_token},
    renderAuth() {context.rendered = true},
    closeSiteAuth() {context.closed = true},
  });
  vm.runInContext([
    section('async function fetchAuthText', 'function showError'),
    section('async function authApi', 'function saveAuthSession'),
    section('async function refreshAdminAccess', 'async function refreshAuthSession'),
    section('async function submitSiteAuth', 'async function changeSitePassword'),
  ].join('\n'), context);
  return context;
}
const response = data => ({ok: true, text: async () => JSON.stringify(data)});
const blockedFetch = (_url, {signal}) => new Promise((_, reject) => {
  signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
});
test('successful login does not wait for admin lookup or request user again', async () => {
  const calls = [];
  const c = setup(async url => {
    calls.push(url);
    if (url.includes('/token?')) return response({access_token: 'fake-token', user: {id: 'qa-user'}});
    throw new Error('unexpected request');
  });
  c.authRest = () => new Promise(() => {});
  await c.submitSiteAuth();
  assert.equal(c.currentUser.id, 'qa-user');
  assert.equal(c.closed && c.rendered, true);
  assert.equal(c.fields['#siteAuthSubmit'].disabled, false);
  assert.equal(calls.length, 1);
  assert.deepEqual(c.alerts, ['로그인되었습니다.']);
});
test('missing login token never falls through to signup', async () => {
  const calls = [];
  const c = setup(async url => {calls.push(url); return response({})});
  await c.submitSiteAuth();
  assert.equal(calls.length, 1);
  assert.equal(c.closed, false);
  assert.match(c.alerts[0], /로그인 응답/);
  assert.equal(c.fields['#siteAuthSubmit'].disabled, false);
});
test('timeout releases busy login button with a retry message', async () => {
  const c = setup(blockedFetch);
  c.setTimeout = (fn, ms) => setTimeout(fn, Math.min(ms, 5));
  await c.submitSiteAuth();
  assert.equal(c.fields['#siteAuthSubmit'].disabled, false);
  assert.equal(c.fields['#siteAuthSubmit'].textContent, '로그인');
  assert.match(c.alerts[0], /서버 응답이 지연/);
});
test('timeout also covers a stalled response body', async () => {
  const c = setup(async (_url, {signal}) => ({text: () => blockedFetch('', {signal})}));
  await assert.rejects(c.fetchAuthText('https://example.invalid', {}, 5), /서버 응답이 지연/);
});
test('late admin result cannot restore admin state after logout', async () => {
  const c = setup();
  let resolve;
  c.currentUser = {id: 'qa-user'}; c.accessToken = 'fake-token';
  c.authRest = () => new Promise(r => {resolve = r});
  const pending = c.refreshAdminAccess();
  c.currentUser = null; c.accessToken = null;
  resolve([{user_id: 'qa-user'}]);
  await pending;
  assert.equal(c.isAdminUser, false);
  assert.equal(c.fields['#siteAdminLink'].hidden, true);
});
