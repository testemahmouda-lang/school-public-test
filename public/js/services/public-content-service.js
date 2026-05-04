/* ═══════════════════════════════════════════════════════
   public-content-service.js — v1.0
   جلب المحتوى العام من Supabase
   ═══════════════════════════════════════════════════════ */

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config.js';

const SELECT_FIELDS =
  'id,title,excerpt,image_url,video_url,content,is_published,pin_home,published_at,sort_order,external_url,metadata';

const TABLE_MAP = {
  news:          'news',
  articles:      'articles',
  activities:    'activities',
  announcements: 'announcements',
};

async function sbFetch(table, qs) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs}`;
  const res  = await fetch(url, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

export async function fetchPublishedContent(pageKey, opts = {}) {
  const table = TABLE_MAP[pageKey];
  if (!table) throw new Error(`pageKey غير معروف: ${pageKey}`);
  const limit = opts.limit ?? 24;

  const params = new URLSearchParams({
    select:       SELECT_FIELDS,
    is_published: 'eq.true',
    deleted_at:   'is.null',
    order:        'sort_order.asc,published_at.desc',
    limit:        String(limit),
  });

  const data = await sbFetch(table, params.toString());
  return (data || []).map(normalizeItem);
}

export async function fetchContentById(pageKey, id) {
  const table = TABLE_MAP[pageKey];
  if (!table) throw new Error(`pageKey غير معروف: ${pageKey}`);

  const params = new URLSearchParams({
    select:       SELECT_FIELDS,
    id:           `eq.${id}`,
    is_published: 'eq.true',
    deleted_at:   'is.null',
    limit:        '1',
  });

  const data = await sbFetch(table, params.toString());
  return data && data.length ? normalizeItem(data[0]) : null;
}

export async function queryStudentResults(queryText, opts = {}) {
  const trimmed = String(queryText || '').trim();
  if (!trimmed) return [];
  const isNumeric = /^\d+$/.test(trimmed.replace(/\s/g, ''));

  const params = new URLSearchParams({
    select: 'id,student_name,seat_no,class_section,grade,term,school_year,subjects',
    order:  'grade.asc,class_section.asc,seat_no.asc',
    limit:  '50',
  });

  if (isNumeric) {
    params.set('seat_no', `eq.${trimmed.replace(/\s/g, '')}`);
  } else {
    params.set('student_name', `ilike.*${trimmed}*`);
  }

  if (opts.term === '1' || opts.term === '2') {
    params.set('term', `eq.${parseInt(opts.term, 10)}`);
  }

  const gradeNum = parseInt(opts.grade, 10);
  if (opts.grade && gradeNum >= 1 && gradeNum <= 9) {
    params.set('grade', `eq.${gradeNum}`);
  }

  const data = await sbFetch('results', params.toString());
  const gv = opts.gradeVisibility || {};
  const t1 = opts.term1Published !== false;
  const t2 = opts.term2Published !== false;

  return (data || []).filter(r => {
    if (gv[String(r.grade)] === false) return false;
    if (r.term === 1 && !t1) return false;
    if (r.term === 2 && !t2) return false;
    return true;
  });
}

/* ── normalize ──────────────────────────────────────── */
function normalizeItem(row) {
  const meta = safeObj(row.metadata);
  let dateLabel = '';
  const dateRaw = row.published_at || meta.date || '';
  if (dateRaw) {
    try {
      dateLabel = new Date(dateRaw).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { /* ignore */ }
  }

  const contentHtml = row.content || meta.bodyHtml || '';
  const metaVideo   = String(meta.videoUrl || '').trim();
  const dbVideo     = String(row.video_url  || '').trim();
  const primaryVideo = metaVideo || dbVideo;

  const embeds = Array.isArray(meta.embeds) ? [...meta.embeds] : [];
  if (metaVideo && !embeds.some(e => (e.url || e.videoId || '') === metaVideo)) embeds.unshift({ url: metaVideo });
  if (dbVideo && dbVideo !== metaVideo && !embeds.some(e => (e.url || e.videoId || '') === dbVideo)) embeds.push({ url: dbVideo });

  return {
    id:          row.id,
    title:       row.title       || '',
    excerpt:     row.excerpt     || '',
    imageUrl:    row.image_url   || meta.imageUrl || '',
    videoUrl:    primaryVideo,
    dateLabel,
    pinHome:     !!row.pin_home,
    embeds,
    contentHtml,
    externalUrl: row.external_url || '',
  };
}

function safeObj(v) {
  if (!v || typeof v !== 'object') {
    if (typeof v === 'string') { try { const p = JSON.parse(v); return (p && typeof p === 'object') ? p : {}; } catch { return {}; } }
    return {};
  }
  return Array.isArray(v) ? {} : v;
}
