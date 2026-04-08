import { Suspense } from 'react';
import BottomNav from '@/components/BottomNav';
import { SettingsProvider } from '@/components/SettingsProvider';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let showDiscount = true;
  let showPrice = true;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('show_discount_tab', 'show_price')"
    );
    for (const row of rows) {
      if (row.key === 'show_discount_tab') {
        showDiscount = row.value !== 'false';
      } else if (row.key === 'show_price') {
        showPrice = row.value !== 'false';
      }
    }
  } catch {
    // fallback to true
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
