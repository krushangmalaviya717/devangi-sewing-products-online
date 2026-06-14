const fs = require('fs');
let content = fs.readFileSync('admin/js/admin.js', 'utf8');

const updatedLogic = `
// ===== ORDERS MANAGEMENT (PROFESSIONAL VERSION V2) =====

async function loadOrders() {
    const status = document.getElementById('order-status-filter')?.value || '';
    const date = document.getElementById('order-date-filter')?.value || '';
    
    try {
        const res = await fetch(\`/api/admin/orders?status=\${status}&date=\${date}\`);
        const orders = await res.json();
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">No orders found.</td></tr>';
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer';
            tr.onclick = () => openOrderDetail(o.id);
            tr.innerHTML = \`<td class="p-4 font-bold text-pink-600 hover:underline">#\${o.id}</td>
                <td class="p-4"><p class="font-medium text-gray-800">\${o.fullname}</p>
                <p class="text-[10px] text-gray-400">\${o.phone}</p></td>
                <td class="p-4 font-medium text-gray-800">Rs. \${o.total_amount.toFixed(2)}</td>
                <td class="p-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider \${getOrderStatusColor(o.status)}">\${o.status}</span></td>
                <td class="p-4 text-xs text-gray-400">\${new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td class="p-4 text-right"><button class="text-pink-600 hover:text-pink-700 font-semibold text-xs transition-colors">View Details →</button></td>\`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading orders:', err);
    }
}

async function openOrderDetail(id) {
    try {
        const res = await fetch('/api/admin/orders/' + id);
        if (!res.ok) throw new Error('Order not found');
        const data = await res.json();
        const order = data.order;
        const items = data.items;
        const tracking = data.tracking;

        // Header
        document.getElementById('detail-order-id').innerText = '#' + order.id;
        document.getElementById('detail-order-date').innerText = new Date(order.created_at).toLocaleString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
        }) + ' from Online Store';

        // Payment Badge
        const paymentBadge = document.getElementById('detail-payment-badge');
        paymentBadge.innerText = order.payment_status || 'Payment pending';
        paymentBadge.className = 'status-badge ' + (order.payment_status === 'Paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200');

        // Fulfillment Badge
        const fulfillmentBadge = document.getElementById('detail-fulfillment-badge');
        const isFulfilled = (order.status === 'Delivered' || order.status === 'Shipped');
        fulfillmentBadge.innerText = isFulfilled ? 'Fulfilled' : 'Unfulfilled';
        fulfillmentBadge.className = 'status-badge ' + (isFulfilled ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200');

        // Fulfillment Card
        document.getElementById('fulfillment-card-title').innerText = (fulfillmentBadge.innerText) + ' (' + items.length + ')';
        const itemsList = document.getElementById('detail-items-list');
        itemsList.innerHTML = items.map(item => \`<div class="flex items-center justify-between"><div class="flex items-center gap-3"><img src="\${item.image || '/assets/images/placeholder.png'}" class="w-12 h-12 rounded border border-gray-100 object-cover"><div><p class="text-sm font-medium text-blue-600 hover:underline cursor-pointer">\${item.name}</p><p class="text-[11px] text-gray-400">SKU: Sewing-\${order.id}-\${item.id} / Standard</p></div></div><div class="text-sm text-right"><p class="font-medium text-gray-800">Rs. \${(item.price * item.quantity).toFixed(2)}</p><p class="text-[10px] text-gray-400">Rs. \${parseFloat(item.price).toFixed(2)} × \${item.quantity}</p></div></div>\`).join('');

        // Payment Summary
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        document.getElementById('detail-subtotal-label').innerText = 'Subtotal (' + items.length + ' item' + (items.length !== 1 ? 's' : '') + ')';
        document.getElementById('detail-subtotal-value').innerText = 'Rs. ' + subtotal.toFixed(2);
        document.getElementById('detail-shipping-value').innerText = 'Rs. ' + parseFloat(order.delivery_charge || 0).toFixed(2);
        document.getElementById('detail-total-value').innerText = 'Rs. ' + parseFloat(order.total_amount).toFixed(2);
        
        const isPaid = order.payment_status === 'Paid';
        document.getElementById('detail-paid-value').innerText = 'Rs. ' + (isPaid ? parseFloat(order.total_amount).toFixed(2) : '0.00');
        document.getElementById('detail-balance-value').innerText = 'Rs. ' + (isPaid ? '0.00' : parseFloat(order.total_amount).toFixed(2));

        // Sidebar (Customer Info)
        document.getElementById('sidebar-customer-name').innerText = order.fullname;
        document.getElementById('sidebar-customer-email').innerText = order.email || 'No email provided';
        document.getElementById('sidebar-customer-phone').innerText = order.phone;
        
        const addrLines = order.address.split(',').map(l => l.trim());
        document.getElementById('sidebar-shipping-address').innerHTML = \`<strong>\${order.fullname}</strong><br>\` + addrLines.join('<br>');

        // Fetch customer order count for "1 order" text
        fetchCustomerStats(order.user_id, order.phone);

        // Timeline (Real History)
        const timelineHistory = document.getElementById('detail-timeline-history');
        timelineHistory.innerHTML = tracking.map(t => \`<div class="relative pb-6 last:pb-0"><div class="absolute -left-[26px] mt-1 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white"></div><div class="flex justify-between items-start"><div><p class="text-sm font-semibold text-gray-700">\${t.status}</p>\${t.note ? \`<p class="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded border border-gray-100">\${t.note}</p>\` : ''}</div><span class="text-[10px] text-gray-400 font-medium uppercase">\${new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>\`).reverse().join(''); 

        // Update Comment Box Placeholder with Admin Initial
        const adminName = "Admin"; 
        document.querySelector('.bg-green-500.text-white.font-bold').innerText = adminName[0];

        toggleModal('orderDetailModal');
    } catch (err) {
        console.error(err);
        alert('Could not load order details.');
    }
}

async function fetchCustomerStats(userId, phone) {
    try {
        const res = await fetch(\`/api/admin/customers/stats?phone=\${phone}\`);
        const stats = await res.json();
        document.getElementById('sidebar-order-count').innerText = stats.order_count + (stats.order_count === 1 ? ' order' : ' orders');
    } catch (err) {
        console.error('Stats fetch error:', err);
    }
}

async function addTimelineComment() {
    const noteEl = document.getElementById('timeline-comment');
    const note = noteEl.value;
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!note.trim()) return;

    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Internal Note', note: note })
        });
        if (res.ok) {
            noteEl.value = '';
            openOrderDetail(orderId); 
            showToast('Comment posted! 💬');
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateOrderStatus(newStatus) {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!confirm('Change order status to ' + newStatus + '?')) return;
    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, note: 'Status updated manually by admin.' })
        });
        if (res.ok) {
            showToast('Status updated to ' + newStatus + '! ✅');
            openOrderDetail(orderId);
            loadOrders();
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateOrderPayment(newStatus) {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!confirm('Mark as ' + newStatus + '?')) return;
    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, note: 'Payment status updated manually.' })
        });
        if (res.ok) {
            showToast('Payment marked as ' + newStatus + '! 💰');
            openOrderDetail(orderId);
            loadOrders();
        }
    } catch (err) {
        console.error(err);
    }
}

function getOrderStatusColor(status) {
    const colors = {
        'Order Placed': 'bg-pink-100 text-pink-700 border border-pink-200',
        'Processing': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        'Shipped': 'bg-blue-100 text-blue-700 border border-blue-200',
        'Delivered': 'bg-green-100 text-green-700 border border-green-200',
        'Cancelled': 'bg-red-100 text-red-700 border border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
}
`;

// Replace from line 815 to end
const lines = content.split('\n');
const baseLines = lines.slice(0, 814); 
fs.writeFileSync('admin/js/admin.js', baseLines.join('\n') + updatedLogic);
console.log('Professional Order Management logic V2 applied.');
