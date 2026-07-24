import type { RoutePlan, RouteRequest } from '@/contracts/route';

export interface RoutesService {
  getRoute(request: RouteRequest): Promise<RoutePlan>;
}

export type RoutesServiceErrorCode =
  | 'configuration'
  | 'network'
  | 'rate-limited'
  | 'no-route'
  | 'upstream'
  | 'invalid-response';

export class RoutesServiceError extends Error {
  constructor(
    message: string,
    readonly code: RoutesServiceErrorCode,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'RoutesServiceError';
  }
}
