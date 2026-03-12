import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscountThreshold } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // premium | discount

  const threshold = await getDiscountThreshold();

  let query = supabase.from('trademarks').select('category');

  if (type === 'premium') {
    query = query.gte('price', threshold);
  } else if (type === 'discount') {
    query = query.lt('price', threshold);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count by category
  const counts: Record<number, number> = {};
  data?.forEach((row: { category: number }) => {
    counts[row.category] = (counts[row.category] || 0) + 1;
  });

  const result = Object.entries(counts)
    .map(([category, count]) => ({ category: parseInt(category), count }))
    .sort((a, b) => a.category - b.category);

  return NextResponse.json(result);
}
