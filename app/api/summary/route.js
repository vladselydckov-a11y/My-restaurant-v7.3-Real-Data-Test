import { NextResponse } from 'next/server';
import { buildDynamicSummary } from '../../../lib/sampleData';
import { getSupabaseSummary } from '../../../lib/supabaseServer';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id') || 'all';

  // v6: если включить USE_SUPABASE=true и добавить ключи Supabase, роут попытается взять реальные данные из базы.
  // Если Supabase не настроен, работает demo-live режим с автообновлением цифр.
  if (process.env.USE_SUPABASE === 'true') {
    const realSummary = await getSupabaseSummary({ restaurantId }).catch((error) => {
      console.error('Supabase summary error:', error);
      return null;
    });
    if (realSummary) return NextResponse.json(realSummary);
  }

  return NextResponse.json(buildDynamicSummary({ restaurantId }));
}
