import { Suspense } from 'react';
import BottomNav from '@/components/BottomNav';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto min-h-screen pb-16">
      {children}
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
