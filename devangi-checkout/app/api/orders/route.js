import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(req) {
  const user = await getAuthUser();
  const body = await req.json();

  const {
    items, address, address_id, save_address, payment_method = 'cod', guest_email, delivery_charge = 0
  } = body;

  if (!items || items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  
  const total_amount = items.reduce((sum, i) => sum + i.price * i.quantity, 0) + delivery_charge;
  const userId = user?.id || null;
  const addressSnapshot = JSON.stringify(address);

  let savedAddressId = address_id || null;

  if (save_address && userId) {
    const [existing] = await db.execute('SELECT COUNT(*) as cnt FROM addresses WHERE user_id = ?', [userId]);
    const isFirst = existing[0].cnt === 0;
    const [res] = await db.execute(
      'INSERT INTO addresses (user_id, address_line1, address_line2, city, state, pincode, country, is_default) VALUES (?,?,?,?,?,?,?,?)',
      [userId, address.address_line1, address.address_line2 || null, address.city, address.state, address.pincode, address.country || 'India', isFirst ? 1 : 0]
    );
    savedAddressId = res.insertId;
  }

  const [orderRes] = await db.execute(
    'INSERT INTO orders (user_id, guest_email, total_amount, delivery_charge, payment_method, order_status, address_id, address_snapshot) VALUES (?,?,?,?,?,?,?,?)',
    [userId, guest_email || null, total_amount, delivery_charge, payment_method, 'Order Placed', savedAddressId, addressSnapshot]
  );
  const orderId = orderRes.insertId;

  for (const item of items) {
    await db.execute(
      'INSERT INTO order_items (order_id, product_id, name, price, quantity, image_url) VALUES (?,?,?,?,?,?)',
      [orderId, item.product_id || null, item.name, item.price, item.quantity, item.image_url || null]
    );
  }

  await db.execute(
    'INSERT INTO order_tracking (order_id, status, note) VALUES (?,?,?)',
    [orderId, 'Order Placed', 'Order received at Devangi Sewing Products']
  );

  return NextResponse.json({ orderId, message: 'Order placed successfully' }, { status: 201 });
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  return NextResponse.json(orders);
}
