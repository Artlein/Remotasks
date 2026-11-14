import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'rt_session';

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
    const userId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!userId) return null;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar || `/avatars/${user.username.toLowerCase()}.svg`,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the session cookie name (used by API routes and middleware).
 */
export const SESSION_COOKIE_NAME = SESSION_COOKIE;
