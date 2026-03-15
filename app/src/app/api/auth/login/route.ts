import { verifyLogin, signToken, COOKIE_NAME } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
  }

  const user = await verifyLogin(username, password);
  if (!user) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const token = signToken(user);
  const res = NextResponse.json({ success: true, username: user.username });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  return res;
}
