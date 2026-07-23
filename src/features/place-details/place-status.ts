export function placeOpeningStatus(isOpen: boolean | undefined) {
  if (isOpen === true) return { label: 'Open now', tone: 'success' as const };
  if (isOpen === false) return { label: 'Closed', tone: 'warning' as const };
  return { label: 'Hours unavailable', tone: 'muted' as const };
}
