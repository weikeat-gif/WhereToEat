import { recordPromotionView } from './promotion-service';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

describe('promotion measurement', () => {
  it('records an active promotion profile view through the protected database function', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });

    await recordPromotionView(
      '3be82851-f46d-43af-9a87-466ef33685d7',
      { rpc },
    );

    expect(rpc).toHaveBeenCalledWith('record_promotion_view', {
      p_promotion_id: '3be82851-f46d-43af-9a87-466ef33685d7',
    });
  });
});
