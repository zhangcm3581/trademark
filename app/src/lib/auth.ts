import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const COOKIE_NAME = 'admin_token';

export async function verifyLogin(username: string, password: string): Promise<{ id: number; username: string } | null> {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash FROM admin_users WHERE username = ?',
    [username]
  );
  const users = rows as { id: number; username: string; password_hash: string }[];
  if (users.length === 0) return null;

  const valid = await bcrypt.compare(password, users[0].password_hash);
  if (!valid) return null;

  return { id: users[0].id, username: users[0].username };
}

export function signToken(payload: { id: number; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function getAuthUser(): Promise<{ id: number; username: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    return decoded;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
