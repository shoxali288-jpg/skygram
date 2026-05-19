import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const body = await request.json();
    const { avatar_url, phone, bio, birth_date, show_phone, show_bio, show_birth_date } = body;

    const updates: Record<string, unknown> = {};
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (birth_date !== undefined) updates.birth_date = birth_date;
    if (show_phone !== undefined) updates.show_phone = show_phone;
    if (show_bio !== undefined) updates.show_bio = show_bio;
    if (show_birth_date !== undefined) updates.show_birth_date = show_birth_date;

    const { error } = await supabase.from('users').update(updates).eq('id', session.userId);

    if (error) return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    await supabase.from('users').update({ avatar_url: base64 }).eq('id', session.userId);

    return NextResponse.json({ avatar_url: base64 });
  } catch {
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
