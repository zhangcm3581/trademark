import { Suspense } from 'react';
import BottomNav from '@/components/BottomNav';
import { SettingsProvider } from '@/components/SettingsProvider';
import { getAllSettings } from '@/lib/settings';
import { getCurrentTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  let showDiscount = true;
  let showPrice = true;
  try {
    const settings = await getAllSettings(tenant);
    if (settings.show_discount_tab !== undefined) {
      showDiscount = settings.show_discount_tab !== 'false';
    }
    if (settings.show_price !== undefined) {
      showPrice = settings.show_price !== 'false';
    }
  } catch {
    // fallback to defaults
  }

  return (
    <SettingsProvider value={{ showPrice }}>
      <div className="max-w-lg mx-auto min-h-screen pb-16">
        {children}
        <Suspense>
          <BottomNav showDiscount={showDiscount} />
        </Suspense>
      </div>
    </SettingsProvider>
  );
}
