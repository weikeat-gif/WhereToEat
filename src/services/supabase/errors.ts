export class BackendUnavailableError extends Error {
  constructor() {
    super(
      'Online accounts are unavailable. Add Supabase credentials and use live data mode to sign in.',
    );
    this.name = 'BackendUnavailableError';
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
