import { get, set, del } from 'idb-keyval';

const SESSION_KEY = 'sitescan-session';
const EVENTS_KEY  = 'sitescan-events';

export async function saveSession(session) {
  await set(SESSION_KEY, session);
}

export async function loadSession() {
  return get(SESSION_KEY);
}

export async function clearSession() {
  await del(SESSION_KEY);
  await del(EVENTS_KEY);
}

export async function appendEvent(event) {
  const existing = (await get(EVENTS_KEY)) || [];
  existing.push(event);
  await set(EVENTS_KEY, existing);
}

export async function loadEvents() {
  return (await get(EVENTS_KEY)) || [];
}
