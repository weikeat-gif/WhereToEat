export type FoodPreferenceKey =
  | 'halal-required'
  | 'vegetarian'
  | 'malaysian'
  | 'malay'
  | 'chinese'
  | 'indian'
  | 'noodles'
  | 'rice'
  | 'cafe-dessert'
  | 'spicy'
  | 'mild'
  | 'supper'
  | 'open-now';

export type FoodPreferenceKind = 'hard' | 'soft';

export type FoodPreferenceDefinition = {
  key: FoodPreferenceKey;
  label: string;
  kind: FoodPreferenceKind;
  description: string;
};

export type FoodPreferenceRecord = {
  userId: string;
  key: FoodPreferenceKey;
  createdAt: string;
};
