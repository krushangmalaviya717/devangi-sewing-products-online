import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, { httpOnly: true, maxAge: 60*60*24*7, path: '/' });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
