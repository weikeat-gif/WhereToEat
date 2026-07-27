import { supabase } from '@/services/supabase/client';

type PromotionRpcClient = {
  rpc(
    name: string,
    parameters: { p_promotion_id: string },
  ): Promise<{ error: { message: string } | null }>;
};

export async function recordPromotionView(
  promotionId: string,
  client: PromotionRpcClient | null = supabase as PromotionRpcClient | null,
) {
  if (!client) return;
  const { error } = await client.rpc('record_promotion_view', {
    p_promotion_id: promotionId,
  });
  if (error) throw new Error(error.message);
}
