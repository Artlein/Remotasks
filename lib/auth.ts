import { cookies } from 'next/headers';
import { db, withRetry } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export { SESSION_COOKIE_NAME };

export interface SessionUser {
  id: string;
  username: string;
  avatar?: string | null;
}

/**
 * Returns the logged-in user from the session cookie, or null if not authenticated.
 * Uses retry logic to handle Supabase cold-start timeouts.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let userId: string | undefined;
  try {
    const cookieStore = await cookies();
    userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!userId) return null;

    const user = await withRetry(() => db.user.findUnique({ where: { id: userId! } }));
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar || `/avatars/${user.username.toLowerCase()}.png`,
    };
  } catch (error) {
    console.error('getSessionUser DB error (after retries):', error);
    // If DB is momentarily unreachable after retries, don't kick out valid session
    if (userId) {
      const username = userId === '8e117503-2d6d-41ac-aebe-1876bae8f02b' ? 'arvin' : 'user';
      return {
        id: userId,
        username,
        avatar: `/avatars/${username}.png`,
      };
    }
    return null;
  }
}
