import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscountThreshold } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get('category');
  const categories = searchParams.get('categories'); // comma-separated category numbers
  const type = searchParams.get('type'); // premium | discount
  const keyword = searchParams.get('keyword');
  const searchField = searchParams.get('searchField'); // name | trademark_no
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const ids = searchParams.get('ids'); // comma-separated IDs for favorites

  const threshold = await getDiscountThreshold();

  let query = supabase.from('trademarks').select('*', { count: 'exact' });

  if (ids) {
    query = query.in('id', ids.split(','));
  }

  if (category) {
    query = query.eq('category', parseInt(category));
  } else if (categories) {
    query = query.in('category', categories.split(',').map(Number));
  }

  if (type === 'premium') {
    query = query.gte('price', threshold);
  } else if (type === 'discount') {
    query = query.lt('price', threshold);
  }

  if (keyword && searchField === 'trademark_no') {
    query = query.ilike('trademark_no', `%${keyword}%`);
  } else if (keyword) {
    query = query.ilike('name', `%${keyword}%`);
  }

  query = query.order('created_at', { ascending: false });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, pageSize });
}
