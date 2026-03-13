import { createServerSupabaseClient } from './supabase-server';
import { PREMIUM_PRICE_THRESHOLD } from './constants';

// Server-side memory cache (60s TTL)
let settingsCache: { data: Record<string, string>; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getAllSettings(): Promise<Record<string, string>> {
  if (settingsCache && Date.now() - settingsCache.ts < CACHE_TTL) {
    return settingsCache.data;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('settings').select('key, value');
    const settings: Record<string, string> = {};
    data?.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });
    settingsCache = { data: settings, ts: Date.now() };
    return settings;
  } catch {
    return settingsCache?.data ?? {};
  }
}

export async function getDiscountThreshold(): Promise<number> {
  const settings = await getAllSettings();
  const val = settings['discount_price_threshold'];
  return val ? parseFloat(val) : PREMIUM_PRICE_THRESHOLD;
}

export function invalidateSettingsCache() {
  settingsCache = null;
}
