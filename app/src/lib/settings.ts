import { createServerSupabaseClient } from './supabase-server';
import { PREMIUM_PRICE_THRESHOLD } from './constants';

export async function getDiscountThreshold(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'discount_price_threshold')
      .single();

    if (data?.value) {
      return parseFloat(data.value);
    }
  } catch {
    // fallback
  }
  return PREMIUM_PRICE_THRESHOLD;
}
