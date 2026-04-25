import createClient, { type Middleware } from 'openapi-fetch';
import * as SecureStore from 'expo-secure-store';
import type { paths, components } from './schema';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    try {
      const jwt = await SecureStore.getItemAsync('jwt');
      if (jwt) request.headers.set('Authorization', `Bearer ${jwt}`);
    } catch {
      // Reading from SecureStore can fail in web contexts; fall through unauthenticated.
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      await SecureStore.deleteItemAsync('jwt').catch(() => undefined);
    }
    return response;
  },
};

export const api = createClient<paths>({ baseUrl: API_BASE_URL });
api.use(authMiddleware);

/**
 * Stripe-style error envelope thrown by every fetch helper. Wraps both
 * server-emitted `{ error: {...} }` payloads and transport failures so the
 * caller has one shape to render against.
 */
export class ApiError extends Error {
  status: number;
  type: string;
  code?: string;

  constructor(status: number, type: string, message: string, code?: string) {
    super(message);
    this.status = status;
    this.type = type;
    this.code = code;
  }
}

/**
 * Throws on `error`, returns `data` on success. Lets hooks use the natural
 * `await fetcher(...)` shape without juggling `{ data, error }` everywhere.
 */
export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: components['schemas']['ApiError']; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error) {
    throw new ApiError(
      response.status,
      error.error?.type ?? 'api_error',
      error.error?.message ?? 'Request failed',
      error.error?.code,
    );
  }
  if (data === undefined) {
    throw new ApiError(response.status, 'api_error', `Empty response (${response.status})`);
  }
  return data;
}

export type { paths, components } from './schema';
