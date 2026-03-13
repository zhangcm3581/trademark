import { Suspense } from 'react';
import BottomNav from '@/components/BottomNav';
import { getAllSettings } from '@/lib/settings';

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAllSettings();
  const showDiscount = settings['show_discount_tab'] !== 'false';

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-16">
      {children}
      <Suspense>
        <BottomNav showDiscount={showDiscount} />
      </Suspense>
    </div>
  );
}
