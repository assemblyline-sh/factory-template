/**
 * Orchestrator API client for step handlers.
 */

const BASE_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:4005';
const API_KEY = process.env.ORCHESTRATOR_API_KEY;
const API_SECRET = process.env.ORCHESTRATOR_API_SECRET;

const headers = {
  'Content-Type': 'application/json',
  'api-key': API_KEY,
  'api-secret': API_SECRET,
};

// GET request helper
export async function orchestratorGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path}: ${res.status} — ${text}`);
  }
  return res.json();
}

// POST request helper
export async function orchestratorPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path}: ${res.status} — ${text}`);
  }
  return res.json();
}

// PUT request helper
export async function orchestratorPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${path}: ${res.status} — ${text}`);
  }
  return res.json();
}

// Item operations
export async function findItemByExternalId(external_id) {
  const result = await orchestratorGet(
    `/api/v1/items?external_id=${encodeURIComponent(external_id)}`
  );
  const items = result.data || [];
  return items.length > 0 ? items[0] : null;
}

export async function getItemTags(item_id) {
  const result = await orchestratorGet(`/api/v1/items/${item_id}/tags`);
  return (result.data || []).map((t) => t.name);
}

export async function createItem({ type, name, external_id, metadata }) {
  const result = await orchestratorPost('/api/v1/items', {
    type,
    name,
    external_id,
    metadata: metadata || {},
  });
  return result.data || result;
}

export async function findOrCreateItem({ type, name, external_id, metadata }) {
  const existing = await findItemByExternalId(external_id);
  if (existing) {
    return { item: existing, created: false };
  }
  const item = await createItem({ type, name, external_id, metadata });
  return { item, created: true };
}

export async function updateItemMetadata(item_id, new_metadata) {
  const existing = await orchestratorGet(`/api/v1/items/${item_id}`);
  const item = existing.data || existing;
  const merged = { ...(item.metadata || {}), ...new_metadata };
  const result = await orchestratorPut(`/api/v1/items/${item_id}`, { metadata: merged });
  return result.data || result;
}

// Process operations
export async function findProcessByName(name) {
  const result = await orchestratorGet(
    `/api/v1/processes?name=${encodeURIComponent(name)}`
  );
  const processes = result.data || [];
  const exact = processes.find((p) => p.name === name);
  if (exact) return exact;
  if (processes.length > 0) {
    console.warn(
      `[orchestrator-api] findProcessByName("${name}") — no exact match. ` +
      `API returned ${processes.length} partial matches: ${processes.map((p) => p.name).join(', ')}`
    );
  }
  return null;
}

export async function runProcess(process_id, { item_id } = {}) {
  const body = item_id ? { item_id } : {};
  const result = await orchestratorPost(`/api/v1/processes/${process_id}/run`, body);
  return result.data || result;
}

// Work record checks
export async function hasSuccessfulRun(item_id, process_name) {
  try {
    const result = await orchestratorGet(
      `/api/v1/items/${item_id}/work-records`
    );
    const records = result.data || result.work_records || [];
    if (records.length === 0) return false;
    let relevant = records;
    if (process_name) {
      relevant = records.filter((r) => r.process_name === process_name);
      if (relevant.length === 0) return false;
    }
    const latest = relevant[relevant.length - 1];
    return latest.status === 'completed';
  } catch (err) {
    console.warn(
      `[orchestrator-api] hasSuccessfulRun(${item_id}): ${err.message}`
    );
    return false;
  }
}

// Notification
export async function sendNotificationEmail({ to, subject, body }) {
  if (!to) {
    return { sent: false, reason: 'no recipient configured' };
  }
  try {
    const res = await fetch(`${BASE_URL}/notifications/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, subject, body }),
    });
    if (res.ok) {
      return { sent: true };
    }
    if (res.status === 404 || res.status === 501) {
      return { sent: false, reason: `endpoint not implemented (${res.status})` };
    }
    const text = await res.text();
    return { sent: false, reason: `${res.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    return { sent: false, reason: `request failed: ${err.message}` };
  }
}
