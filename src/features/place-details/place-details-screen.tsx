import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenPlaceholder
      title="Restaurant details"
      description={`Loading restaurant ${id ?? ''} from the shared place service.`}
    />
  );
}
