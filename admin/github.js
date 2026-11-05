// Клиент GitHub REST API для админки. Токен уходит только на api.github.com.
const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decodeUtf8(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export class GitHub {
  constructor({ token, repo, branch }) {
    this.token = token;
    this.repo = repo;
    this.branch = branch || 'main';
    this.tokenExpires = null;
  }
  async req(method, path, body, { raw = false, accept } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: accept || (raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json'),
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (e) {
      throw new GitHubError(0, 'Нет связи с GitHub. Проверьте интернет.');
    }
    const exp = res.headers.get('github-authentication-token-expiration');
    if (exp) this.tokenExpires = exp;
    if (res.status === 204) return null;
    const text = await res.text();
    let data = text;
    if (!raw) { try { data = text ? JSON.parse(text) : null; } catch (e) { /* оставить текст */ } }
    if (!res.ok) {
      const msg = (data && data.message) || text || res.statusText;
      throw new GitHubError(res.status, explain(res.status, msg), data);
    }
    return data;
  }
  get r() { return `/repos/${this.repo}`; }

  async user() { return this.req('GET', '/user'); }
  async repoInfo() { return this.req('GET', this.r); }
  async headSha() {
    const ref = await this.req('GET', `${this.r}/git/ref/heads/${encodeURIComponent(this.branch)}`);
    return ref.object.sha;
  }
  async readText(path, ref) {
    return this.req('GET', `${this.r}/contents/${encPath(path)}?ref=${encodeURIComponent(ref || this.branch)}`, null, { raw: true });
  }
  async readJson(path, ref) {
    const t = await this.readText(path, ref);
    return typeof t === 'string' ? JSON.parse(t) : t;
  }
  async fileSha(path, ref) {
    try {
      const d = await this.req('GET', `${this.r}/contents/${encPath(path)}?ref=${encodeURIComponent(ref || this.branch)}`, null, { accept: 'application/vnd.github.object+json' });
      return d && d.sha;
    } catch (e) { if (e.status === 404) return null; throw e; }
  }
  async listDir(path) {
    try {
      const d = await this.req('GET', `${this.r}/contents/${encPath(path)}?ref=${encodeURIComponent(this.branch)}`);
      return Array.isArray(d) ? d : [];
    } catch (e) { if (e.status === 404) return []; throw e; }
  }
  async commits(path, perPage = 30) {
    return this.req('GET', `${this.r}/commits?sha=${encodeURIComponent(this.branch)}&path=${encodeURIComponent(path)}&per_page=${perPage}`);
  }
  async runsFor(sha) {
    return this.req('GET', `${this.r}/actions/runs?head_sha=${sha}&per_page=5`);
  }
  // Один коммит из нескольких файлов: [{path, text}|{path, base64}|{path, delete:true}]
  async commitFiles(files, message, expectedHead) {
    const head = await this.headSha();
    if (expectedHead && head !== expectedHead) {
      const e = new GitHubError(409, 'В репозитории появились новые изменения после того, как вы открыли админку.');
      e.conflict = true; e.head = head;
      throw e;
    }
    const commit = await this.req('GET', `${this.r}/git/commits/${head}`);
    const tree = [];
    for (const f of files) {
      if (f.delete) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
      if (f.text !== undefined) {
        const blob = await this.req('POST', `${this.r}/git/blobs`, { content: b64encodeUtf8(f.text), encoding: 'base64' });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      } else {
        const blob = await this.req('POST', `${this.r}/git/blobs`, { content: f.base64, encoding: 'base64' });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      if (f.onDone) f.onDone();
    }
    const newTree = await this.req('POST', `${this.r}/git/trees`, { base_tree: commit.tree.sha, tree });
    const newCommit = await this.req('POST', `${this.r}/git/commits`, { message, tree: newTree.sha, parents: [head] });
    await this.req('PATCH', `${this.r}/git/refs/heads/${encodeURIComponent(this.branch)}`, { sha: newCommit.sha, force: false });
    return newCommit.sha;
  }
}

function encPath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }

function explain(status, msg) {
  if (status === 401) return 'Токен не подходит: он неверный, отозван или истёк. Выпустите новый.';
  if (status === 403 && /rate limit/i.test(msg)) return 'GitHub временно ограничил запросы. Подождите несколько минут.';
  if (status === 403) return 'У токена нет прав на это действие. Нужно разрешение Contents: Read and write для этого репозитория.';
  if (status === 404) return 'Не найдено. Проверьте название репозитория и ветки, и что токен выдан именно на этот репозиторий.';
  if (status === 409) return 'Конфликт версий в репозитории. Обновите страницу.';
  if (status === 422) return 'GitHub отклонил изменения: ' + msg;
  return `GitHub ответил ошибкой ${status}: ${msg}`;
}

export const util = { b64encodeUtf8, b64decodeUtf8 };

/* ---------- Тестовый режим без GitHub (только на localhost, ?mock=1) ---------- */
export class MockGitHub {
  constructor() {
    this.repo = 'demo/zagorizont'; this.branch = 'main'; this.tokenExpires = '2027-02-05 12:00:00 UTC';
    this.sha = 'mock000'; this.n = 0; this.files = {}; this.log = [];
  }
  async user() { return { login: 'demo', name: 'Тестовый режим' }; }
  async repoInfo() { return { full_name: this.repo, permissions: { push: true }, private: false, html_url: '#' }; }
  async headSha() { return this.sha; }
  async readJson(path) {
    if (this.files[path]) return JSON.parse(this.files[path]);
    const r = await fetch('../' + path, { cache: 'no-store' });
    return r.json();
  }
  async readText(path) { const r = await fetch('../' + path, { cache: 'no-store' }); return r.text(); }
  async fileSha() { return 'mockfile'; }
  async listDir(path) {
    try {
      const html = await (await fetch('../' + path + '/', { cache: 'no-store' })).text();
      return [...html.matchAll(/href="([^"?/]+\.(?:webp|jpe?g|png|gif|svg|mp4|pdf))"/gi)].map((m) => ({ type: 'file', name: decodeURIComponent(m[1]), path: path + '/' + decodeURIComponent(m[1]), size: 0 }));
    } catch (e) { return []; }
  }
  async commits() {
    return [{ sha: 'mock000', commit: { message: 'Исходная версия', author: { name: 'demo', date: new Date(Date.now() - 864e5).toISOString() } }, html_url: '#' }]
      .concat(this.log.map((l) => ({ sha: l.sha, commit: { message: l.message, author: { name: 'demo', date: l.date } }, html_url: '#' })).reverse());
  }
  async runsFor(sha) {
    const l = this.log.find((x) => x.sha === sha);
    const age = l ? Date.now() - new Date(l.date).getTime() : 99999;
    return { workflow_runs: [{ status: age > 6000 ? 'completed' : 'in_progress', conclusion: age > 6000 ? 'success' : null, html_url: '#' }] };
  }
  async commitFiles(files, message, expectedHead) {
    if (expectedHead && expectedHead !== this.sha) { const e = new GitHubError(409, 'Конфликт (тест)'); e.conflict = true; throw e; }
    for (const f of files) { if (f.text !== undefined) this.files[f.path] = f.text; if (f.onDone) f.onDone(); }
    this.sha = 'mock' + String(++this.n).padStart(3, '0');
    this.log.push({ sha: this.sha, message, date: new Date().toISOString(), files: files.map((f) => (f.delete ? '-' : '+') + f.path) });
    console.log('[mock commit]', message, files.map((f) => (f.delete ? '-' : '+') + f.path));
    window.__mockCommits = this.log;
    return this.sha;
  }
}
