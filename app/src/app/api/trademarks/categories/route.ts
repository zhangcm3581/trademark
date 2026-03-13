import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscountThreshold } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // premium | discount

  const threshold = await getDiscountThreshold();

  const { data, error } = await supabase.rpc('count_trademarks_by_category', {
    price_filter: type || null,
    price_threshold: threshold,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const res = NextResponse.json(data);
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
}
