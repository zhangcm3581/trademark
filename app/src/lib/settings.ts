import pool from './db';
import { PREMIUM_PRICE_THRESHOLD } from './constants';
import type { Tenant } from './tenant';
import { DEFAULT_TENANT } from './tenant';
import { RowDataPacket } from 'mysql2';

// 按租户缓存（60s TTL）
const CACHE_TTL = 60_000;
const settingsCache = new Map<Tenant, { data: Record<string, string>; ts: number }>();

export async function getAllSettings(tenant: Tenant = DEFAULT_TENANT): Promise<Record<string, string>> {
  const cached = settingsCache.get(tenant);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT `key`, `value` FROM settings WHERE tenant = ?',
      [tenant]
    );
    const settings: Record<string, string> = {};
    rows.forEach((row: RowDataPacket) => {
      settings[row.key as string] = row.value as string;
    });
    settingsCache.set(tenant, { data: settings, ts: Date.now() });
    return settings;
  } catch {
    return cached?.data ?? {};
  }
}

export async function getDiscountThreshold(tenant: Tenant = DEFAULT_TENANT): Promise<number> {
  const settings = await getAllSettings(tenant);
  const val = settings['discount_price_threshold'];
  return val ? parseFloat(val) : PREMIUM_PRICE_THRESHOLD;
}

/**
 * 失效设置缓存。
 *   不传 tenant -> 清空全部租户缓存
 *   传 tenant   -> 只清空该租户
 */
export function invalidateSettingsCache(tenant?: Tenant) {
  if (tenant) {
    settingsCache.delete(tenant);
  } else {
    settingsCache.clear();
  }
}
