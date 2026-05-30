// W2 — Sync Meta Ads (wersja standalone z konfiguracją inline)
// Node "Code" w n8n, język JavaScript, tryb: Run Once for All Items
// PO WGRANIU: uzupełnij SUPABASE_SERVICE_KEY i META_TOKEN poniżej.

const cfg = {
  SUPABASE_URL: 'https://vruvzezatzkyvmhbtriq.supabase.co',
  SUPABASE_SERVICE_KEY: 'WKLEJ_SERVICE_ROLE_KEY',
  META_TOKEN: 'WKLEJ_META_TOKEN',
  META_API_VERSION: 'v22.0',
  DAYS_BACK: '7',
};

let SB = String(cfg.SUPABASE_URL);
if (SB.endsWith('/')) SB = SB.slice(0, -1);

const KEY   = cfg.SUPABASE_SERVICE_KEY;
const TOKEN = cfg.META_TOKEN;
const VER   = cfg.META_API_VERSION || 'v22.0';
const DAYS  = parseInt(cfg.DAYS_BACK || '7', 10);

const sbHeaders = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const fmt = (d) => d.toISOString().slice(0, 10);
const until = new Date();
const since = new Date(Date.now() - DAYS * 86400000);

const LEAD_OBJECTIVES = ['LEAD_GENERATION', 'OUTCOME_LEADS'];
const LEAD_ACTIONS    = ['lead', 'onsite_conversion.lead_grouped'];

const sumActions = (arr, types) => {
  let total = 0;
  for (const a of (arr || [])) {
    if (types.includes(a.action_type)) total += parseFloat(a.value || 0);
  }
  return total;
};

const clients = await this.helpers.httpRequest({
  method: 'GET',
  url: SB + '/rest/v1/clients?select=id,name,meta_ad_account_id&meta_ad_account_id=not.is.null',
  headers: sbHeaders,
  json: true,
});

const summary = [];

for (const c of clients) {
  let acct = String(c.meta_ad_account_id || '').trim();

  let synced = 0;
  let errMsg = null;

  // Pomiń klientów bez sensownego ID konta
  if (!acct || acct === 'act_') {
    summary.push({ client: c.name, synced: 0, error: 'Brak meta_ad_account_id' });
    continue;
  }
  if (!acct.startsWith('act_')) acct = 'act_' + acct;

  try {
    const timeRange = JSON.stringify({ since: fmt(since), until: fmt(until) });
    let url = 'https://graph.facebook.com/' + VER + '/' + acct + '/insights'
      + '?level=campaign&time_increment=1&limit=500'
      + '&fields=campaign_id,campaign_name,objective,spend,impressions,clicks,ctr,actions,cost_per_action_type'
      + '&time_range=' + encodeURIComponent(timeRange)
      + '&access_token=' + encodeURIComponent(TOKEN);

    const rows = [];
    while (url) {
      const resp = await this.helpers.httpRequest({ method: 'GET', url, json: true });
      for (const r of (resp.data || [])) {
        const leads = sumActions(r.actions, LEAD_ACTIONS);
        let cpl = sumActions(r.cost_per_action_type, LEAD_ACTIONS);
        const spend = parseFloat(r.spend || 0);
        if (!cpl && leads) cpl = spend / leads;
        const isLead = LEAD_OBJECTIVES.includes(r.objective) || leads > 0;

        rows.push({
          external_id: r.campaign_id,
          name: r.campaign_name,
          objective: r.objective || null,
          is_lead_gen: isLead,
          date: r.date_start,
          spend: spend,
          impressions: parseInt(r.impressions || 0, 10),
          clicks: parseInt(r.clicks || 0, 10),
          leads: Math.round(leads),
          ctr: r.ctr ? parseFloat(r.ctr) : null,
          cpl: cpl ? Number(cpl.toFixed(2)) : null,
        });
      }
      url = (resp.paging && resp.paging.next) ? resp.paging.next : null;
    }

    if (rows.length) {
      await this.helpers.httpRequest({
        method: 'POST',
        url: SB + '/rest/v1/rpc/sync_meta_data',
        headers: sbHeaders,
        body: { p_client_id: c.id, p_rows: rows },
        json: true,
      });
      synced = rows.length;
    }
  } catch (e) {
    // Wyciągnij dokładny komunikat błędu z odpowiedzi Meta
    let detail = e.message || String(e);
    try {
      const body =
        (e.cause && e.cause.error && e.cause.error.message) ? e.cause.error.message :
        (e.response && e.response.body) ? e.response.body :
        (e.error && e.error.message) ? e.error.message : null;
      if (body) detail += ' | META: ' + (typeof body === 'string' ? body : JSON.stringify(body));
    } catch (_) {}
    errMsg = String(detail).slice(0, 400);
  }

  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: SB + '/rest/v1/sync_jobs',
      headers: Object.assign({}, sbHeaders, { Prefer: 'return=minimal' }),
      body: {
        client_id: c.id,
        source: 'meta',
        status: errMsg ? 'error' : 'success',
        rows_synced: synced,
        error_message: errMsg,
        finished_at: new Date().toISOString(),
      },
      json: true,
    });
  } catch (e) { /* best-effort */ }

  summary.push({ client: c.name, synced, error: errMsg });
}

return summary.map((s) => ({ json: s }));
