export type AuthProviderName = 'apple' | 'google' | 'email';

export type AppUser = {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
};
