import { WorkerEntrypoint, DurableObject } from 'cloudflare:workers';

/* ══════════════════════════════════════════════════════
   PAGE MAP — جميع صفحات الموقع
   ══════════════════════════════════════════════════════ */
const PAGE_MAP = {
  '':                     'index_html',
  '/':                    'index_html',
  'index.html':           'index_html',
  '/index.html':          'index_html',
  'about':                'about_html',
  '/about':               'about_html',
  'about.html':           'about_html',
  '/about.html':          'about_html',
  'stages':               'stages_html',
  '/stages':              'stages_html',
  'stages.html':          'stages_html',
  '/stages.html':         'stages_html',
  'news':                 'news_html',
  '/news':                'news_html',
  'news.html':            'news_html',
  '/news.html':           'news_html',
  'announcements':        'announcements_html',
  '/announcements':       'announcements_html',
  'announcements.html':   'announcements_html',
  '/announcements.html':  'announcements_html',
  'articles':             'articles_html',
  '/articles':            'articles_html',
  'articles.html':        'articles_html',
  '/articles.html':       'articles_html',
  'activities':           'activities_html',
  '/activities':          'activities_html',
  'activities.html':      'activities_html',
  '/activities.html':     'activities_html',
  'contact':              'contact_html',
  '/contact':             'contact_html',
  'contact.html':         'contact_html',
  '/contact.html':        'contact_html',
  'results':              'results_html',
  '/results':             'results_html',
  'results.html':         'results_html',
  '/results.html':        'results_html',
};

const ALLOWED_PAGE_KEYS = new Set([
  'index_html','about_html','stages_html','news_html','announcements_html',
  'articles_html','activities_html','contact_html','results_html',
]);

function inferPageKey(pathname) {
  const n = String(pathname || '').trim();
  if (PAGE_MAP[n]) return PAGE_MAP[n];
  const file = n.split('/').pop() || '';
  return PAGE_MAP[file] || null;
}

function resolveAssetPath(pathname) {
  if (pathname === '/' || pathname === '') return '/index.html';
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return pathname;
  const key = inferPageKey(pathname);
  if (key) return pathname.replace(/\/$/, '') + '.html';
  return pathname;
}

/* ══════════════════════════════════════════════════════
   CACHING HEADERS
   ══════════════════════════════════════════════════════ */
function applyCachingHeaders(request, response, isAdmin = false) {
  const pathname = new URL(request.url).pathname;
  const headers  = new Headers(response.headers);
  headers.set('X-App-Version', '20260504-hero-preclean-v1');

  if (isAdmin) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else if (
    pathname.endsWith('.html') || pathname === '/' || pathname === '' || !!inferPageKey(pathname)
  ) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  } else if (/\.(js|css|json|txt|xml|svg)$/i.test(pathname)) {
    headers.set('Cache-Control', 'no-cache, must-revalidate');
  } else {
    headers.set('Cache-Control', 'public, max-age=3600');
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/* ── helpers ─────────────────────────────────────────── */
function isAdminPath(pathname) {
  return pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/');
}

function shouldCountRequest(request, response, pageKey) {
  if (!pageKey) return false;
  if (request.method.toUpperCase() !== 'GET') return false;
  if (response.status !== 200) return false;
  if (!(response.headers.get('Content-Type') || '').toLowerCase().includes('text/html')) return false;
  const dest = (request.headers.get('Sec-Fetch-Dest') || '').toLowerCase();
  if (dest && dest !== 'document') return false;
  const accept = (request.headers.get('Accept') || '').toLowerCase();
  if (accept && !accept.includes('text/html')) return false;
  return true;
}

function dayKeyUTC(ts) { return new Date(ts).toISOString().slice(0, 10); }
function dateLabelAr(dayKey) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function sanitizePageKey(raw) {
  const v = String(raw || '').trim();
  return ALLOWED_PAGE_KEYS.has(v) ? v : 'index_html';
}
function sanitizePath(raw) {
  const v = String(raw || '').trim();
  if (!v) return '/';
  return v.startsWith('/') ? v.slice(0, 200) : `/${v.slice(0, 199)}`;
}

async function getStatsStub(env) {
  const id = env.VISITOR_STATS.idFromName('global');
  return env.VISITOR_STATS.get(id);
}

/* ══════════════════════════════════════════════════════
   DURABLE OBJECT — VISITOR STATS
   ══════════════════════════════════════════════════════ */
export class VisitorStats extends DurableObject {
  async trackVisit(payload = {}) {
    const now     = Date.now();
    const pageKey = sanitizePageKey(payload.pageKey);
    const path    = sanitizePath(payload.path);
    const dayKey  = dayKeyUTC(now);

    const total = Number((await this.ctx.storage.get('total')) || 0) + 1;
    await this.ctx.storage.put('total', total);

    const byPage = (await this.ctx.storage.get('byPage')) || {};
    byPage[pageKey] = Number(byPage[pageKey] || 0) + 1;
    await this.ctx.storage.put('byPage', byPage);

    const dailyVisits = (await this.ctx.storage.get('dailyVisits')) || {};
    dailyVisits[dayKey] = Number(dailyVisits[dayKey] || 0) + 1;
    const keepKeys = Object.keys(dailyVisits).sort().slice(-35);
    const trimmed  = {};
    for (const key of keepKeys) trimmed[key] = dailyVisits[key];
    await this.ctx.storage.put('dailyVisits', trimmed);
    await this.ctx.storage.put('lastVisit', { at: now, page: pageKey, path });

    return { ok: true };
  }

  async getStats() {
    const total     = Number((await this.ctx.storage.get('total')) || 0);
    const byPage    = (await this.ctx.storage.get('byPage')) || {};
    const dailyRaw  = (await this.ctx.storage.get('dailyVisits')) || {};
    const lastVisit = (await this.ctx.storage.get('lastVisit')) || null;

    const dailyVisits = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - i);
      const key = dayKeyUTC(date.getTime());
      dailyVisits[key] = { count: Number(dailyRaw[key] || 0), label: dateLabelAr(key) };
    }

    return {
      ok: true,
      pageViews: { total, byPage, lastVisitAt: lastVisit?.at || 0, lastVisitPage: lastVisit?.page || '', lastVisitPath: lastVisit?.path || '' },
      dailyVisits,
      generatedAt: now,
    };
  }
}

/* ══════════════════════════════════════════════════════
   WORKER ENTRYPOINT — Service Binding للأدمن
   ══════════════════════════════════════════════════════ */
export class SiteService extends WorkerEntrypoint {
  async getVisitorStats() {
    const stub = await getStatsStub(this.env);
    return await stub.getStats();
  }
}

/* ══════════════════════════════════════════════════════
   FETCH HANDLER
   ══════════════════════════════════════════════════════ */
export default {
  async fetch(request, env, ctx) {
    const url      = new URL(request.url);
    const pathname = url.pathname;

    /* Health check */
    if (pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'site', time: Date.now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    /* Admin routes */
    if (isAdminPath(pathname)) {
      if (pathname === '/admin') return Response.redirect(url.origin + '/admin/', 301);
      const adminUrl = new URL(request.url);
      if (pathname === '/admin/') adminUrl.pathname = '/admin/index.html';
      const resp = await env.ASSETS.fetch(new Request(adminUrl.toString(), request));
      return applyCachingHeaders(request, resp, true);
    }

    /* Public pages — clean URL → .html */
    const assetUrl    = new URL(request.url);
    assetUrl.pathname = resolveAssetPath(pathname);
    const response    = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    const pageKey     = inferPageKey(pathname);

    if (shouldCountRequest(request, response, pageKey)) {
      ctx.waitUntil(
        getStatsStub(env)
          .then(stub => stub.trackVisit({ pageKey, path: pathname || '/' }))
          .catch(err  => console.error('visitor tracking failed', err?.message || err))
      );
    }

    return applyCachingHeaders(request, response);
  },
};
