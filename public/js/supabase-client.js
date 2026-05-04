import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export async function fetchJson(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

export async function fetchSettingValue(settingKey) {
  const rows = await fetchJson(
    `settings?select=setting_value&setting_key=eq.${encodeURIComponent(settingKey)}&limit=1`
  );
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  return row?.setting_value && typeof row.setting_value === 'object'
    ? row.setting_value : null;
}

export async function fetchActiveUrgentItems() {
  const rows = await fetchJson(
    'urgent_messages?select=id,title,message,sort_order,is_active,created_at&is_active=eq.true&order=sort_order.asc,created_at.desc'
  );
  return Array.isArray(rows) ? rows : [];
}
