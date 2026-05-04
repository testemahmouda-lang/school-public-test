/* ═══════════════════════════════════════════════════════
   app.js — v2.0
   نفس منهج العرض بالضبط: cc2-card · classifyMedia · ?id= detail · YouTube embed
   ═══════════════════════════════════════════════════════ */

import { loadPublicCore }          from './services/public-settings-service.js';
import {
  fetchPublishedContent,
  fetchContentById,
  queryStudentResults,
}                                  from './services/public-content-service.js';

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */
function esc(v = '') {
  return String(v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function el(id) { return document.getElementById(id); }
function setTxt(id, val) { const e = el(id); if (e && val != null) e.textContent = val; }

function setFooterBrandName(name) {
  const target = el('footer-school-name');
  if (!target) return;
  const clean = String(name || '').trim() || 'مدرسة شبشير الحصة للتعليم الأساسي';
  if (clean.includes(' للتعليم الأساسي')) {
    const firstLine = clean.replace(' للتعليم الأساسي', '').trim();
    target.innerHTML = `${esc(firstLine)}<br>للتعليم الأساسي`;
    return;
  }
  target.textContent = clean;
}

function setFooterEmail(email) {
  const clean = String(email || '').trim();
  const item = el('footer-email-item');
  const link = el('footer-email-link');
  setTxt('footer-email', clean);
  if (link) link.setAttribute('href', clean ? `mailto:${clean}` : '#');
  if (item) item.hidden = !clean;
}

/* ── cache (5 min) ─────────────────────────────────── */
const CACHE_KEY = 'site_core_v1';
const CACHE_TTL = 5 * 60 * 1000;
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* ignore */ }
}

/* ── Page detection ────────────────────────────────── */
function detectPage() {
  const path = location.pathname.split('/').pop() || 'index.html';
  if (path === '' || path === 'index.html') return 'home';
  return path.replace('.html', '');
}

/* ══════════════════════════════════════════════════════
   MEDIA UTILITIES — نفس منطق content-page.js تماماً
   ══════════════════════════════════════════════════════ */
function getYouTubeId(url) {
  if (!url) return null;
  if (/^[A-Za-z0-9_\-]{11}$/.test(url)) return url;
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{11})/
  );
  return m ? m[1] : null;
}

function getFirstVideoId(item) {
  if (item.videoUrl) {
    const id = getYouTubeId(item.videoUrl);
    if (id) return id;
  }
  const embeds = Array.isArray(item.embeds) ? item.embeds : [];
  for (const e of embeds) {
    const id = getYouTubeId(e?.videoId || e?.url || '');
    if (id) return id;
  }
  return null;
}

function classifyMedia(item) {
  const hasImage = !!item.imageUrl;
  let videoId = item.videoUrl ? getYouTubeId(item.videoUrl) : null;
  if (!videoId && Array.isArray(item.embeds) && item.embeds[0]) {
    const e = item.embeds[0];
    videoId = getYouTubeId(e.videoId || e.url || '');
  }
  const hasVideo = !!videoId;
  const thumbSrc = hasVideo ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  return { hasImage, hasVideo, videoId, thumbSrc };
}

/* ══════════════════════════════════════════════════════
   CC2-CARD — نفس بطاقة content-page.js بالضبط
   5 حالات وسائط: image+video · video-thumb · video-no-thumb · image-only · no-media
   ══════════════════════════════════════════════════════ */
const PAGE_META = {
  news:          { title:'أخبار المدرسة',     kicker:'آخر المستجدات',   desc:'تابع آخر الأخبار والفعاليات الرسمية',            icon:'📰', tag:'أخبار مدرسية',  emptyMsg:'لا توجد أخبار منشورة حالياً'  },
  articles:      { title:'المقالات التعليمية', kicker:'ركن المعرفة',     desc:'مقالات ومحتوى تعليمي يفيد الطلاب وأولياء الأمور', icon:'📝', tag:'مقال تعليمي', emptyMsg:'لا توجد مقالات منشورة حالياً' },
  activities:    { title:'الأنشطة المدرسية',   kicker:'الحياة المدرسية', desc:'فعاليات وأنشطة تعزز مسيرة الطلاب',               icon:'🎭', tag:'نشاط مدرسي', emptyMsg:'لا توجد أنشطة منشورة حالياً'  },
  announcements: { title:'الإعلانات الرسمية',  kicker:'تنبيهات المدرسة', desc:'إعلانات وتنبيهات رسمية من إدارة المدرسة',        icon:'📢', tag:'إعلان',       emptyMsg:'لا توجد إعلانات منشورة حالياً' },
};

function renderCc2Card(item, meta, pageKey) {
  const { hasImage, hasVideo, thumbSrc } = classifyMedia(item);
  const detailUrl = `${pageKey}.html?id=${esc(item.id)}`;

  let mediaHtml = '';
  let mediaCls  = '';
  const onerr = `onerror="this.closest('.cc2-media').classList.add('cc2-media-error');this.style.display='none'"`;

  if (hasImage && hasVideo) {
    mediaCls  = 'has-image has-video';
    mediaHtml = `<img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" loading="lazy" ${onerr} />
      <div class="cc2-video-badge" aria-label="يحتوي فيديو">&#9654; فيديو</div>`;
  } else if (!hasImage && hasVideo && thumbSrc) {
    mediaCls  = 'video-only has-video';
    mediaHtml = `<img src="${esc(thumbSrc)}" alt="${esc(item.title)}" loading="lazy" ${onerr} />
      <div class="cc2-video-badge" aria-label="يحتوي فيديو">&#9654; فيديو</div>`;
  } else if (!hasImage && hasVideo && !thumbSrc) {
    mediaCls  = 'video-only has-video no-thumb';
    mediaHtml = `<div class="cc2-video-no-thumb">
      <span class="cc2-video-no-thumb-icon" aria-hidden="true">&#9654;</span>
      <span class="cc2-video-no-thumb-label">فيديو</span></div>`;
  } else if (hasImage) {
    mediaCls  = 'has-image';
    mediaHtml = `<img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" loading="lazy" ${onerr} />`;
  } else {
    mediaCls  = 'no-media';
    mediaHtml = `<div class="cc2-no-media-shell" aria-hidden="true">
      <span class="cc2-no-media-icon">${meta.icon}</span></div>`;
  }

  return `
    <article class="cc2-card reveal is-visible ${mediaCls}">
      <a href="${detailUrl}" class="cc2-media" tabindex="-1" aria-hidden="true">
        ${mediaHtml}
        ${item.pinHome ? '<div class="cc2-pin-badge">&#9733;</div>' : ''}
      </a>
      <div class="cc2-body">
        <div class="cc2-meta">
          <span class="cc2-tag">${meta.tag}</span>
          ${item.dateLabel ? `<span class="cc2-date">&#128197; ${esc(item.dateLabel)}</span>` : ''}
        </div>
        <h3 class="cc2-title">
          <a href="${detailUrl}">${esc(item.title)}</a>
        </h3>
        ${item.excerpt ? `<p class="cc2-excerpt">${esc(item.excerpt)}</p>` : ''}
        <a href="${detailUrl}" class="cc2-read-more">اقرأ المزيد <span aria-hidden="true">&#8592;</span></a>
      </div>
    </article>`;
}

/* ══════════════════════════════════════════════════════
   DETAIL VIEW — نفس renderDetailView من content-page.js
   cover + body HTML + YouTube embed + external URL
   ══════════════════════════════════════════════════════ */
function renderDetailInContainer(container, item, meta, pageKey) {
  const videoId      = getFirstVideoId(item);
  const thumbSrc     = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const coverSrc     = item.imageUrl || thumbSrc;
  const isVideoCover = !item.imageUrl && !!thumbSrc;
  const coverOnerr   = `onerror="this.closest('.ad2-cover').classList.add('ad2-cover-error');this.style.display='none'"`;

  const coverHtml = coverSrc
    ? `<div class="ad2-cover${isVideoCover ? ' ad2-video-cover' : ''}">
         <img src="${esc(coverSrc)}" alt="${esc(item.title)}" loading="eager" ${coverOnerr} />
         ${isVideoCover ? '<div class="ad2-cover-video-badge">&#9654; فيديو</div>' : ''}
       </div>`
    : '';

  container.innerHTML = `
    <article class="article-detail-v2 reveal is-visible">
      ${coverHtml}
      <div class="ad2-header">
        <div class="ad2-meta">
          <span class="cc2-tag">${meta.tag}</span>
          ${item.dateLabel ? `<span class="cc2-date">&#128197; ${esc(item.dateLabel)}</span>` : ''}
          ${item.pinHome ? '<span class="cc2-tag cc2-pin">&#9733; مثبت</span>' : ''}
        </div>
        <h2 class="ad2-title">${esc(item.title)}</h2>
        ${item.excerpt ? `<p class="ad2-excerpt">${esc(item.excerpt)}</p>` : ''}
      </div>
      ${item.contentHtml
        ? `<div class="ad2-body">${item.contentHtml}</div>`
        : (item.contentText ? `<div class="ad2-body"><p>${esc(item.contentText)}</p></div>` : '')}
      ${videoId ? `
      <div class="ad2-video-section">
        <h3>&#127909; مقطع الفيديو</h3>
        <div class="ad2-video-wrap">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0"
            title="فيديو" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen loading="lazy">
          </iframe>
        </div>
      </div>` : ''}
      ${item.externalUrl ? `
      <div class="ad2-external">
        <a href="${esc(item.externalUrl)}" target="_blank" rel="noopener noreferrer" class="btn">
          &#128279; الرابط الخارجي
        </a>
      </div>` : ''}
      <div class="ad2-footer">
        <a href="${pageKey}.html" class="btn outline-dark">&#8592; العودة للقائمة</a>
      </div>
    </article>`;
}


/* ══════════════════════════════════════════════════════
   GENERIC CONTENT PAGE LOADER
   يُستخدم لـ: news · articles · activities · announcements
   يدعم: ?id=xxx للعرض التفصيلي + cc2-grid للقائمة
   ══════════════════════════════════════════════════════ */
async function loadContentPage(pageKey, containerId) {
  const container = el(containerId);
  if (!container) return;

  const meta = PAGE_META[pageKey];

  /* ── عرض تفصيلي بـ ?id= ── */
  const urlId = new URLSearchParams(window.location.search).get('id');
  if (urlId) {
    container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ تحميل المحتوى…</span></div>`;
    try {
      const item = await fetchContentById(pageKey, urlId);
      if (item) {
        renderDetailInContainer(container, item, meta, pageKey);
      } else {
        container.innerHTML = `<div class="cc2-empty">${meta.icon} المحتوى المطلوب غير متاح.</div>`;
      }
    } catch (err) {
      console.error(`[app:${pageKey}:detail]`, err);
      container.innerHTML = `<div class="cc2-empty">⚠️ تعذر تحميل المحتوى، حاول مجدداً لاحقاً.</div>`;
    }
    return;
  }

  /* ── قائمة cc2-grid ── */
  container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ تحميل ${meta.title}…</span></div>`;
  try {
    const items = await fetchPublishedContent(pageKey, { limit: 24 });
    if (!items.length) {
      container.innerHTML = `<div class="cc2-empty">${meta.icon} ${meta.emptyMsg}</div>`;
      return;
    }
    container.innerHTML = `<div class="cc2-grid">${items.map(item => renderCc2Card(item, meta, pageKey)).join('')}</div>`;
  } catch (err) {
    console.error(`[app:${pageKey}]`, err);
    container.innerHTML = `<div class="cc2-empty">⚠️ تعذر تحميل ${meta.title}، حاول مجدداً لاحقاً.</div>`;
  }
}

/* ══════════════════════════════════════════════════════
   HOME PAGE — نفس renderNewsListCard من home-page.js
   ══════════════════════════════════════════════════════ */
function renderHomeNewsCard(item, num) {
  const { hasImage, hasVideo, thumbSrc } = classifyMedia(item);
  const url   = `news.html?id=${esc(item.id)}`;
  const thumb = hasImage ? item.imageUrl : (hasVideo && thumbSrc ? thumbSrc : null);
  const isImportant = !!item.pinHome;
  const tagLabel    = isImportant ? '⭐ مهم' : 'خبر';

  const thumbHtml = thumb
    ? `<div class="hp-nl-thumb" style="background-image:url(${esc(thumb)})">
         ${hasVideo ? `<span class="hp-nl-play">▶</span>` : ''}
       </div>`
    : `<div class="hp-nl-thumb hp-nl-no-thumb"><span style="font-size:1.4rem;opacity:.3">📰</span></div>`;

  return `<article class="hp-nl-card reveal is-visible" onclick="location.href='${url}'" style="cursor:pointer">
    <div class="hp-nl-num ${isImportant ? 'hp-nl-num-gold' : ''}">${num}</div>
    ${thumbHtml}
    <div class="hp-nl-body">
      <div class="hp-nl-meta">
        <span class="cc2-tag" style="font-size:.72rem;padding:2px 9px">${tagLabel}</span>
        <span class="hp-nl-date">&#128197; ${esc(item.dateLabel || '')}</span>
      </div>
      <h3 class="hp-nl-title">${esc(item.title)}</h3>
      ${item.excerpt ? `<p class="hp-nl-excerpt">${esc(item.excerpt.slice(0,110))}${item.excerpt.length > 110 ? '...' : ''}</p>` : ''}
      <div class="hp-nl-foot">
        ${hasVideo ? `<span class="hp-nl-vid">▶ فيديو</span>` : '<span></span>'}
        <a href="${url}" class="mini-link" onclick="event.stopPropagation()">اقرأ المزيد ←</a>
      </div>
    </div>
  </article>`;
}

async function loadHomeNews(core) {
  const container = el('decap-home-news');
  if (!container) return;
  if (core.sections?.news === false) { container.innerHTML = ''; return; }

  container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ تحميل الأخبار…</span></div>`;
  try {
    const items = await fetchPublishedContent('news', { limit: 4 });
    if (!items.length) {
      container.innerHTML = `<div class="cc2-empty home-news-empty"><span class="home-news-empty-icon">📰</span><strong>لا توجد أخبار منشورة حالياً</strong><small>عند إضافة خبر من لوحة التحكم سيظهر هنا مباشرة بنفس تنسيق الموقع.</small></div>`;
      return;
    }
    container.innerHTML = `<div class="hp-news-list">${items.map((item, i) => renderHomeNewsCard(item, i + 1)).join('')}</div>`;
  } catch (err) {
    console.error('[app:home:news]', err);
    container.innerHTML = `<div class="cc2-empty home-news-empty"><span class="home-news-empty-icon">⚠️</span><strong>تعذر تحميل الأخبار حالياً</strong><small>راجع الاتصال أو لوحة التحكم، وسيظل شكل الصفحة ثابتاً بدون كسر.</small></div>`;
  }
}

function getAnnouncementTone(item) {
  const src = `${item.title || ''} ${item.excerpt || ''}`.toLowerCase();
  if (/عاجل|urgent/.test(src)) return { icon:'⚡', label:'عاجل', className:'urgent' };
  if (/تنبيه|تحذير|warning/.test(src)) return { icon:'⚠️', label:'تنبيه', className:'alert' };
  if (/نتيجة|نتائج|اعتماد|قبول/.test(src)) return { icon:'✅', label:'تنويه', className:'notice' };
  return { icon:'📢', label:'إعلان', className:'default' };
}

function renderHomeAnnouncementCard(item, num) {
  const { hasImage, hasVideo, thumbSrc } = classifyMedia(item);
  const url = `announcements.html?id=${esc(item.id)}`;
  const thumb = hasImage ? item.imageUrl : (hasVideo && thumbSrc ? thumbSrc : null);
  const tone = getAnnouncementTone(item);
  const excerpt = item.excerpt ? `${item.excerpt.slice(0, 145)}${item.excerpt.length > 145 ? '...' : ''}` : '';

  const mediaHtml = thumb
    ? `<div class="hp-ann-thumb" style="background-image:url(${esc(thumb)})">${hasVideo ? '<span class="hp-ann-play">▶</span>' : ''}</div>`
    : `<div class="hp-ann-icon" aria-hidden="true">${tone.icon}</div>`;

  return `<article class="hp-ann-card hp-ann-${tone.className} reveal is-visible" onclick="location.href='${url}'" style="cursor:pointer">
    <div class="hp-ann-num">${num}</div>
    ${mediaHtml}
    <div class="hp-ann-body">
      <div class="hp-ann-meta">
        <span class="hp-ann-tag">${tone.label}</span>
        ${item.dateLabel ? `<span class="hp-ann-date">&#128197; ${esc(item.dateLabel)}</span>` : ''}
      </div>
      <h3 class="hp-ann-title">${esc(item.title || `إعلان رسمي ${num}`)}</h3>
      ${excerpt ? `<p class="hp-ann-excerpt">${esc(excerpt)}</p>` : ''}
      <a href="${url}" class="hp-ann-read" onclick="event.stopPropagation()">اقرأ المزيد ←</a>
    </div>
  </article>`;
}

async function loadHomeAnnouncements(core) {
  const container = el('decap-home-announcements');
  if (!container) return;
  if (core.sections?.announcements === false) { container.innerHTML = ''; return; }

  container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ تحميل الإعلانات…</span></div>`;
  try {
    const items = await fetchPublishedContent('announcements', { limit: 3 });
    if (!items.length) {
      container.innerHTML = `<div class="cc2-empty home-announcements-empty"><span class="home-announcements-empty-icon">📢</span><strong>لا توجد إعلانات منشورة حالياً</strong><small>عند إضافة إعلان من لوحة التحكم سيظهر هنا مباشرة بدون أي محتوى تجريبي.</small></div>`;
      return;
    }
    container.innerHTML = `<div class="hp-ann-list">${items.map((item, i) => renderHomeAnnouncementCard(item, i + 1)).join('')}</div>`;
  } catch (err) {
    console.error('[app:home:announcements]', err);
    container.innerHTML = `<div class="cc2-empty home-announcements-empty"><span class="home-announcements-empty-icon">⚠️</span><strong>تعذر تحميل الإعلانات حالياً</strong><small>راجع الاتصال أو لوحة التحكم، وسيظل شكل الصفحة ثابتاً بدون كسر.</small></div>`;
  }
}

function renderHomeArticleCard(item, num) {
  const icons = ['📚', '🧠', '✏️'];
  const url = `articles.html?id=${esc(item.id)}`;
  const rawExcerpt = item.excerpt || '';
  const excerpt = rawExcerpt.length > 115 ? `${rawExcerpt.slice(0, 115)}...` : rawExcerpt;
  const title = item.title || `مقال تعليمي ${num}`;

  return `<article class="home-article-card reveal is-visible" onclick="location.href='${url}'" style="cursor:pointer">
    <div class="home-article-icon" aria-hidden="true">${icons[(num - 1) % icons.length]}</div>
    <h3>${esc(title)}</h3>
    ${excerpt ? `<p>${esc(excerpt)}</p>` : '<p>مقال تعليمي من محتوى المدرسة الرسمي لدعم الطلاب وأولياء الأمور.</p>'}
    <a href="${url}" class="home-article-read" onclick="event.stopPropagation()">اقرأ المقال ←</a>
  </article>`;
}

async function loadHomeArticles(core) {
  const container = el('decap-home-articles');
  if (!container) return;
  if (core.sections?.articles === false) { container.innerHTML = ''; return; }

  container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ تحميل المقالات…</span></div>`;
  try {
    const items = await fetchPublishedContent('articles', { limit: 3 });
    if (!items.length) {
      container.innerHTML = `<div class="cc2-empty">📝 لا توجد مقالات بعد</div>`;
      return;
    }
    container.innerHTML = items.map((item, i) => renderHomeArticleCard(item, i + 1)).join('');
  } catch (err) {
    console.error('[app:home:articles]', err);
    container.innerHTML = `<div class="cc2-empty">تعذر تحميل المقالات حالياً.</div>`;
  }
}

function getActivityTone(item, num = 1) {
  const src = `${item.title || ''} ${item.excerpt || ''}`.toLowerCase();
  if (/رحلة|زيارة|متحف|trip|visit/.test(src)) return { icon:'🚌', label:'زيارة مدرسية', className:'trip' };
  if (/رياض|كرة|مسابقة|بطولة|sport|sports/.test(src)) return { icon:'🏅', label:'نشاط رياضي', className:'sport' };
  if (/فن|رسم|مسرح|إذاعة|art|theater/.test(src)) return { icon:'🎨', label:'نشاط فني', className:'art' };
  const icons = ['🎭', '🌿', '📸'];
  return { icon:icons[(num - 1) % icons.length], label:'نشاط مدرسي', className:'default' };
}

function renderHomeActivityCard(item, num) {
  const { hasImage, hasVideo, thumbSrc } = classifyMedia(item);
  const url = `activities.html?id=${esc(item.id)}`;
  const thumb = hasImage ? item.imageUrl : (hasVideo && thumbSrc ? thumbSrc : null);
  const tone = getActivityTone(item, num);
  const rawExcerpt = item.excerpt || '';
  const excerpt = rawExcerpt.length > 120 ? `${rawExcerpt.slice(0, 120)}...` : rawExcerpt;

  const mediaHtml = thumb
    ? `<div class="home-act-thumb" style="background-image:url(${esc(thumb)})">${hasVideo ? '<span class="home-act-play">▶</span>' : ''}</div>`
    : `<div class="home-act-icon" aria-hidden="true">${tone.icon}</div>`;

  return `<article class="home-act-card home-act-${tone.className} reveal is-visible" onclick="location.href='${url}'" style="cursor:pointer">
    <div class="home-act-num">${num}</div>
    ${mediaHtml}
    <div class="home-act-body">
      <div class="home-act-meta">
        <span class="home-act-tag">${tone.label}</span>
        ${item.dateLabel ? `<span class="home-act-date">&#128197; ${esc(item.dateLabel)}</span>` : ''}
      </div>
      <h3 class="home-act-title">${esc(item.title || `نشاط مدرسي ${num}`)}</h3>
      ${excerpt ? `<p class="home-act-excerpt">${esc(excerpt)}</p>` : ''}
      <a href="${url}" class="home-act-read" onclick="event.stopPropagation()">شاهد النشاط ←</a>
    </div>
  </article>`;
}

async function loadHomeActivities(core) {
  const container = el('decap-home-activities');
  if (!container) return;
  if (core.sections?.activities === false) { container.innerHTML = ''; return; }

  container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ تحميل الأنشطة…</span></div>`;
  try {
    const items = await fetchPublishedContent('activities', { limit: 3 });
    if (!items.length) {
      container.innerHTML = `<div class="cc2-empty home-activities-empty"><span class="home-activities-empty-icon">🎭</span><strong>لا توجد أنشطة منشورة حالياً</strong><small>عند إضافة نشاط من لوحة التحكم سيظهر هنا مباشرة بنفس تنسيق الصفحة الرئيسية.</small></div>`;
      return;
    }
    container.innerHTML = `<div class="home-act-list">${items.map((item, i) => renderHomeActivityCard(item, i + 1)).join('')}</div>`;
  } catch (err) {
    console.error('[app:home:activities]', err);
    container.innerHTML = `<div class="cc2-empty home-activities-empty"><span class="home-activities-empty-icon">⚠️</span><strong>تعذر تحميل الأنشطة حالياً</strong><small>راجع الاتصال أو لوحة التحكم، وسيظل شكل الصفحة ثابتاً بدون كسر.</small></div>`;
  }
}

function buildHomeResultsGrades(resultsConfig = {}, queryOpen = false) {
  const names = {
    '1':'الأول الابتدائي','2':'الثاني الابتدائي','3':'الثالث الابتدائي',
    '4':'الرابع الابتدائي','5':'الخامس الابتدائي','6':'السادس الابتدائي',
    '7':'الأول الإعدادي','8':'الثاني الإعدادي','9':'الثالث الإعدادي',
  };
  const gv = resultsConfig.gradeVisibility || {};
  const visible = Object.keys(names).filter(key => gv[key] !== false);
  if (!visible.length) {
    return `<div class="home-results-empty-line">لم يتم إتاحة صفوف للعرض بعد.</div>`;
  }
  return visible.map(key => {
    const tag = queryOpen ? 'a' : 'div';
    const href = queryOpen ? ` href="results.html?grade=${key}"` : '';
    return `<${tag} class="home-results-grade ${queryOpen ? 'is-open' : 'is-waiting'}"${href}>
      <span>${names[key]}</span>
      <em>${queryOpen ? 'متاح' : 'انتظار'}</em>
    </${tag}>`;
  }).join('');
}

function buildHomeResultsTermBadges(resultsConfig = {}) {
  const year = esc(resultsConfig.currentYear || '2025 / 2026');
  const t1 = !!resultsConfig.term1Published;
  const t2 = !!resultsConfig.term2Published;
  return `
    <div class="home-results-term ${t1 ? 'is-open' : 'is-waiting'}">
      <strong>${t1 ? '✅' : '⏳'} الفصل الأول</strong>
      <span>${year} — ${t1 ? 'متاح' : 'قريبًا'}</span>
    </div>
    <div class="home-results-term ${t2 ? 'is-open' : 'is-waiting'}">
      <strong>${t2 ? '✅' : '⏳'} الفصل الثاني</strong>
      <span>${year} — ${t2 ? 'متاح' : 'قريبًا'}</span>
    </div>`;
}

function loadHomeResults(core) {
  const section = el('section-home-results');
  const container = el('decap-home-results');
  if (!section || !container) return;

  const rc = core.resultsConfig || {};
  const sectionEnabled = core.sections?.results !== false && rc.sectionVisible !== false;
  if (!sectionEnabled) {
    section.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const queryOpen = rc.queryVisible !== false && (rc.term1Published || rc.term2Published);
  const actionHtml = queryOpen
    ? `<a class="btn home-results-action" href="results.html">استعلام النتائج ←</a>`
    : `<div class="home-results-note">الاستعلام غير مفتوح حالياً — سيتم تفعيل الزر تلقائياً بعد النشر من لوحة التحكم.</div>`;

  container.innerHTML = `
    <div class="home-results-layout">
      <article class="home-results-card home-results-card-main">
        <div class="home-results-icon" aria-hidden="true">🏆</div>
        <h3>استعلام رسمي بعد اعتماد النتيجة</h3>
        <p>هذا القسم مأخوذ من هيكل الموقع القديم، لكن بتصميم متناسق مع الهوية الجديدة، ويعرض حالة النشر والصفوف المتاحة حسب إعدادات لوحة التحكم.</p>
        <div class="home-results-terms">${buildHomeResultsTermBadges(rc)}</div>
        ${actionHtml}
      </article>
      <article class="home-results-card home-results-card-grades">
        <div class="home-results-mini-head">
          <span>الصفوف المتاحة</span>
          <small>${queryOpen ? 'جاهزة للاستعلام' : 'تظهر هنا حسب الإعدادات'}</small>
        </div>
        <div class="home-results-grade-list">${buildHomeResultsGrades(rc, queryOpen)}</div>
      </article>
    </div>`;
}

async function loadHomePage(core) {
  await Promise.all([
    loadHomeNews(core),
    loadHomeAnnouncements(core),
    loadHomeArticles(core),
    loadHomeActivities(core),
  ]);
  loadHomeResults(core);
}

/* ══════════════════════════════════════════════════════
   RESULTS PAGE — فحص الإتاحة + استعلام كامل
   ══════════════════════════════════════════════════════ */
async function loadResultsPage(core) {
  const form      = el('results-form');
  const container = el('results-output');
  if (!form || !container) return;

  const rc        = core.resultsConfig || {};
  const queryOpen = rc.queryVisible !== false && (rc.term1Published || rc.term2Published);

  if (!queryOpen) {
    container.innerHTML = `<div class="cc2-empty" style="flex-direction:column;gap:16px">
      <div style="font-size:2.5rem">📊</div>
      <h3>الاستعلام غير مفتوح حالياً</h3>
      <p style="max-width:420px">سيتم فتح الاستعلام عند صدور النتائج الرسمية. تابع الإعلانات.</p>
      <div style="display:flex;flex-direction:column;gap:8px;text-align:right;font-size:.9rem">
        <div>${rc.term1Published ? '✅' : '⏳'} الفصل الأول — ${rc.term1Published ? 'متاح' : 'لم يُنشر بعد'}</div>
        <div>${rc.term2Published ? '✅' : '⏳'} الفصل الثاني — ${rc.term2Published ? 'متاح' : 'لم يُنشر بعد'}</div>
      </div>
    </div>`;
    form.style.display = 'none';
    return;
  }

  form.style.display = '';
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const q = (el('results-query')?.value || '').trim();
    if (!q) return;
    container.innerHTML = `<div class="cc2-loading"><div class="cc2-spinner"></div><span>جارِ البحث…</span></div>`;
    try {
      const results = await queryStudentResults(q, rc);
      if (!results.length) {
        container.innerHTML = `<div class="cc2-empty">⚠️ لم يتم العثور على نتائج لهذا الاسم أو رقم الجلوس.</div>`;
        return;
      }
      container.innerHTML = results.map(r => {
        const subs = r.subjects && typeof r.subjects === 'object'
          ? Object.entries(r.subjects).map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${esc(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:800">${esc(String(v))}</td></tr>`).join('')
          : '';
        return `<div class="article-detail-v2" style="margin-bottom:20px">
          <div class="ad2-header">
            <div class="ad2-meta">
              <span class="cc2-tag">الصف ${esc(String(r.grade))}</span>
              <span class="cc2-tag">شعبة ${esc(r.class_section || '')}</span>
              <span class="cc2-tag">رقم الجلوس: ${esc(String(r.seat_no || ''))}</span>
            </div>
            <h2 class="ad2-title">${esc(r.student_name)}</h2>
          </div>
          ${subs ? `<div class="ad2-body" style="padding:0">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#eff6ff"><th style="padding:10px 12px;text-align:right;font-weight:800">المادة</th><th style="padding:10px 12px;text-align:right;font-weight:800">الدرجة</th></tr></thead>
              <tbody>${subs}</tbody>
            </table>
          </div>` : ''}
          <div class="ad2-footer" style="padding:14px 20px">
            <span style="font-size:.85rem;color:#64748b">العام: ${esc(r.school_year || rc.currentYear || '')} — الفصل ${esc(String(r.term || ''))}</span>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      console.error('[app:results]', err);
      container.innerHTML = `<div class="cc2-empty">تعذر تنفيذ الاستعلام. حاول مجدداً لاحقاً.</div>`;
    }
  });
}

/* ══════════════════════════════════════════════════════
   PROFILE + URGENT
   ══════════════════════════════════════════════════════ */
function applyProfile(profile) {
  const name = profile.school_name || 'مدرسة شبشير الحصة للتعليم الأساسي';
  const pagePath = location.pathname.split('/').pop() || 'index.html';
  if (pagePath === '' || pagePath === 'index.html') {
    document.title = name;
  } else {
    const pageTitle = (document.title.split('—')[0] || '').trim();
    document.title = pageTitle && pageTitle !== name ? `${pageTitle} — ${name}` : name;
  }
  setTxt('site-name',         name);
  setFooterBrandName(name);
  setTxt('footer-school-name-bottom', name);
  setTxt('footer-phone',      profile.phone   || '');
  setFooterEmail(profile.email || '');
  setTxt('footer-address',    profile.address || '');
  const fbUrl = profile.facebook_url || '';
  document.querySelectorAll('a[data-fb-link]').forEach(a => { if (fbUrl) a.href = fbUrl; });
}

function applyUrgentBar(core) {
  const bar   = el('urgent-bar');
  const items = (core.urgents || []).filter(i => i.is_active !== false);
  if (!bar) return;
  if (core.sections?.urgent === false || !items.length) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `<div class="urgent-inner container"><strong>⚡ عاجل</strong><span>${items.map(i => esc(i.title || '')).join(' • ')}</span></div>`;
}

/* ══════════════════════════════════════════════════════
   SECTIONS VISIBILITY
   يُخفي روابط ناف/فوتر + أقسام homepage للأقسام المُعطَّلة من الأدمن
   يُعيد Set بأسماء الأقسام المُخفاة ليستخدمها main()
   ══════════════════════════════════════════════════════ */
function applySectionsVisibility(core) {
  const sections = core.sections || {};

  /* href كل قسم وID قسم homepage (إن وُجد) */
  const CFG = [
    { key:'news',          href:'news.html',          homeId:'section-home-news'       },
    { key:'announcements', href:'announcements.html', homeId:'section-home-announcements' },
    { key:'articles',      href:'articles.html',      homeId:'section-home-articles'   },
    { key:'activities',    href:'activities.html',    homeId:'section-home-activities' },
    { key:'results',       href:'results.html',       homeId:'section-home-results'    },
  ];

  const hidden = new Set();

  for (const { key, href, homeId } of CFG) {
    const sectionEnabled = sections[key] !== false && (key !== 'results' || core.resultsConfig?.sectionVisible !== false);
    document.body.classList.toggle(`${key}-section-enabled`, sectionEnabled);

    if (!sectionEnabled) {
      hidden.add(key);

      /* ── ناف: روابط مباشرة (عن المدرسة / news / activities … في باقي الصفحات) ── */
      document.querySelectorAll(`#main-menu > a[href="${href}"]`).forEach(a => { a.style.display = 'none'; });

      /* ── فوتر ── */
      document.querySelectorAll(`footer a[href="${href}"]`).forEach(a => { a.style.display = 'none'; });

      /* ── أزرار nav-cta — مُخفاة بالـ HTML مبدئياً، تبقى مخفية ── */
      document.querySelectorAll(`a.nav-cta[href="${href}"]`).forEach(a => { a.style.display = 'none'; });

      /* ── قسم homepage ── */
      if (homeId) { const s = el(homeId); if (s) s.style.display = 'none'; }

    } else {
      /* القسم مُفعَّل: اكشف جميع العناصر المُقيَّدة [data-section-gated] لهذا القسم ── */
      document.querySelectorAll(`[data-section-gated="${key}"]`).forEach(a => { a.style.display = ''; });
    }
  }

  return hidden;
}

/* ══════════════════════════════════════════════════════
   MAIN BOOT
   ══════════════════════════════════════════════════════ */
async function main() {
  const page   = detectPage();
  const cached = readCache();
  const core   = cached || await loadPublicCore().then(c => { writeCache(c); return c; });

  applyProfile(core.profile);
  applyUrgentBar(core);
  const hiddenSections = applySectionsVisibility(core);

  /* ── صفحة مُعطَّلة: أظهر رسالة وأوقف تحميل المحتوى ── */
  const _PAGE_CONT = {
    news:'decap-news-list', announcements:'decap-announcements-list',
    articles:'decap-articles-list', activities:'decap-activities-list',
    results:'results-output',
  };
  if (hiddenSections.has(page) && _PAGE_CONT[page]) {
    const _c = el(_PAGE_CONT[page]);
    if (_c) _c.innerHTML = `
      <div class="cc2-empty" style="flex-direction:column;gap:14px;padding:70px 20px;text-align:center">
        <div style="font-size:3rem">🚫</div>
        <h3 style="font-size:1.1rem;font-weight:800;margin:0">هذا القسم غير متاح حالياً</h3>
        <p style="color:var(--muted,#64748b);max-width:380px;margin:0 auto;font-size:.93rem">
          تم إيقاف هذا القسم مؤقتاً من قِبل الإدارة.
          تابع الإعلانات الرسمية لمزيد من المعلومات.
        </p>
        <a href="index.html" style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;
           padding:10px 20px;border-radius:999px;border:2px solid var(--primary,#1a56db);
           color:var(--primary,#1a56db);font-weight:800;font-size:.9rem;text-decoration:none">
          &#8594; العودة للصفحة الرئيسية
        </a>
      </div>`;
    if (page === 'results') { const _f = el('results-form'); if (_f) _f.style.display = 'none'; }
  } else {
    switch (page) {
      case 'home':          await loadHomePage(core);                                          break;
      case 'news':          await loadContentPage('news',          'decap-news-list');         break;
      case 'activities':    await loadContentPage('activities',    'decap-activities-list');   break;
      case 'announcements': await loadContentPage('announcements', 'decap-announcements-list');break;
      case 'articles':      await loadContentPage('articles',      'decap-articles-list');     break;

      case 'results':       await loadResultsPage(core);                                       break;
      /* about / contact / stages: محتوى ثابت */
    }
  }

  if (cached) {
    loadPublicCore().then(fresh => {
      writeCache(fresh);
      applyProfile(fresh.profile);
      applyUrgentBar(fresh);
      applySectionsVisibility(fresh);
    }).catch(() => { /* ignore */ });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  main().catch(err => console.error('[app:main]', err));
});
