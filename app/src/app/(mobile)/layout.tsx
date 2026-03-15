import { Suspense } from 'react';
import BottomNav from '@/components/BottomNav';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let showDiscount = true;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT `value` FROM settings WHERE `key` = 'show_discount_tab'"
    );
    if (rows.length > 0) {
      showDiscount = rows[0].value !== 'false';
    }
  } catch {
    // fallback to true
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-16">
      {children}
      <Suspense>
        <BottomNav showDiscount={showDiscount} />
      </Suspense>
    </div>
  );
}
