import { placeOpeningStatus } from './place-status';

describe('placeOpeningStatus', () => {
  it.each([
    [true, 'Open now'],
    [false, 'Closed'],
    [undefined, 'Hours unavailable'],
  ] as const)('maps %s to %s', (isOpen, label) => {
    expect(placeOpeningStatus(isOpen).label).toBe(label);
  });
});
