import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

export type Tenant = 'vip' | 'app';

export const TENANTS: Tenant[] = ['vip', 'app'];
export const DEFAULT_TENANT: Tenant = 'vip';

/**
 * 域名 → 租户
 *
 *   biaoxiaosheng.com           -> vip
 *   biaoxiaosheng.lvh.me        -> vip
 *   localhost                   -> vip
 *
 *   app.biaoxiaosheng.com       -> app
 *   app.biaoxiaosheng.lvh.me    -> app
 *   app.localhost               -> app
 *
 * 未知 host 一律回退到 vip，保证老的访问方式（IP/curl）继续工作。
 */
export function tenantFromHost(host: string | null | undefined): Tenant {
  if (!host) return DEFAULT_TENANT;
  const clean = host.split(':')[0].toLowerCase();
  if (clean.startsWith('app.')) return 'app';
  return DEFAULT_TENANT;
}

/**
 * 服务端：取当前请求的租户
 *
 * 优先级：
 *   1. DEV_TENANT 环境变量（仅开发环境，方便强制固定一边）
 *   2. Host header（生产逻辑）
 */
export async function getCurrentTenant(): Promise<Tenant> {
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_TENANT) {
    const t = process.env.DEV_TENANT;
    if (t === 'vip' || t === 'app') return t;
  }
  const h = await headers();
  return tenantFromHost(h.get('host'));
}

/**
 * 从任意字符串解析租户，未知值回退到默认。
 * 用于后台 X-Tenant 请求头、URL 查询参数等不可信输入的归一化。
 */
export function parseTenant(input: string | null | undefined): Tenant {
  if (input === 'vip' || input === 'app') return input;
  return DEFAULT_TENANT;
}

/**
 * 路由级 helper：取请求最终归属的租户
 *
 * 解析顺序：
 *   1. ?tenant=vip|app  查询参数（开发/调试用的后门）
 *   2. Host header      （生产逻辑：域名即租户）
 *   3. DEV_TENANT       （开发期 override，仅 NODE_ENV !== 'production'）
 *
 * 设计：管理后台和前台都通过域名隔离，不再使用 X-Tenant 请求头。
 *   - biaoxiaosheng.com / 主域 → vip
 *   - app.biaoxiaosheng.com   → app
 */
export async function resolveRequestTenant(request: NextRequest): Promise<Tenant> {
  const queryTenant = request.nextUrl.searchParams.get('tenant');
  if (queryTenant) return parseTenant(queryTenant);
  return getCurrentTenant();
}
