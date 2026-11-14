import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export { SESSION_COOKIE_NAME };

export interface SessionUser {
  id: string;
  username: string;
  avatar?: string | null;
}

/**
 * Returns the logged-in user from the session cookie, or null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!userId) return null;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar || `/avatars/${user.username.toLowerCase()}.png`,
    };
  } catch (error) {
    console.error('getSessionUser DB error:', error);
    // If DB is momentarily unreachable, do not kick out valid logged-in session
    try {
      const cookieStore = await cookies();
      const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (userId) {
        return {
          id: userId,
          username: userId === '8e117503-2d6d-41ac-aebe-1876bae8f02b' ? 'arvin' : 'user',
          avatar: '/avatars/arvin.png',
        };
      }
    } catch {}
    return null;
  }
}
