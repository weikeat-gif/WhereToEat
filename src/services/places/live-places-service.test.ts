import { LivePlacesService } from '@/services/places/live-places-service';
import { PlacesServiceError } from '@/services/places/places-service';

describe('LivePlacesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls only the configured proxy and maps rate-limit responses', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Too many requests', { status: 429 }));
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(
      service.autocompleteArea('Klang', 'session-123'),
    ).rejects.toMatchObject<Partial<PlacesServiceError>>({
      code: 'rate-limited',
      retryable: true,
      status: 429,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://places.example.test/api/autocomplete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ input: 'Klang', sessionToken: 'session-123' }),
      }),
    );
  });

  it('maps network failures without exposing provider details', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(
      service.getPlaceDetails('place-1'),
    ).rejects.toMatchObject<Partial<PlacesServiceError>>({
      code: 'network',
      retryable: true,
    });
  });
});
