'use client';

import { useEffect, useState } from 'react';

export type BackstageTenant = 'vip' | 'app';

/**
 * 从浏览器 hostname 推断当前后台面向的租户。
 * 与服务端 lib/tenant.ts 的 tenantFromHost 规则保持一致：
 *   - app.* 前缀 → app
 *   - 其它（含 localhost、lvh.me、IP）→ vip
 */
export function tenantFromHostname(hostname: string): BackstageTenant {
  if (!hostname) return 'vip';
  const clean = hostname.toLowerCase();
  if (clean.startsWith('app.')) return 'app';
  return 'vip';
}

/** React hook：只在客户端读取当前租户，SSR 时为 null。*/
export function useCurrentTenant(): BackstageTenant | null {
  const [tenant, setTenant] = useState<BackstageTenant | null>(null);
  useEffect(() => {
    setTenant(tenantFromHostname(window.location.hostname));
  }, []);
  return tenant;
}

const DESCRIBE: Record<BackstageTenant, { name: string; host: string; dot: string; bg: string; text: string }> = {
  vip: {
    name: '优质客户',
    host: 'biaoxiaosheng.com',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
  },
  app: {
    name: '普通客户',
    host: 'app.biaoxiaosheng.com',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
  },
};

export function describeTenant(tenant: BackstageTenant) {
  return DESCRIBE[tenant];
}

/**
 * 只读的租户徽章：显示当前后台所属租户（由域名决定，不可切换）。
 */
export default function TenantBadge() {
  const tenant = useCurrentTenant();

  if (!tenant) {
    return <div className="h-7 w-40 rounded-lg bg-slate-100 animate-pulse" />;
  }

  const info = DESCRIBE[tenant];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${info.bg}`}>
      <span className={`w-2 h-2 rounded-full ${info.dot}`} />
      <span className={`text-xs font-medium ${info.text}`}>
        当前租户：<span className="font-semibold">{info.name}</span>
      </span>
      <span className="text-[10px] text-gray-400 font-mono">{info.host}</span>
    </div>
  );
}
