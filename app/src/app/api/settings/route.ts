import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAllSettings, invalidateSettingsCache } from '@/lib/settings';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const settings = await getAllSettings();
  const res = NextResponse.json(settings);
  res.headers.set('Cache-Control', 'private, no-cache');
  return res;
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  invalidateSettingsCache();

  return NextResponse.json({ success: true });
}
