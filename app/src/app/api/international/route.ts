import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const country = searchParams.get('country');
  const keyword = searchParams.get('keyword');
  const searchField = searchParams.get('searchField');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const ids = searchParams.get('ids');

  let query = supabase.from('international_trademarks').select('*', { count: 'exact' });

  if (ids) {
    query = query.in('id', ids.split(','));
  }

  if (country) {
    query = query.eq('country', country);
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
