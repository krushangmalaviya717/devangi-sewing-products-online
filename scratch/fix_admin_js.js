const fs = require('fs');
const content = fs.readFileSync('admin/js/admin.js', 'utf8');
const lines = content.split('\n');
const restoredLines = lines.slice(0, 814); // Keep original up to banner deletion 

const newCode = `
// ===== ORDERS MANAGEMENT =====

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

        document.getElementById('detail-order-id').innerText = '#' + order.id;
        document.getElementById('detail-order-date').innerText = new Date(order.created_at).toLocaleString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
        }) + ' from Online Store';

        const paymentBadge = document.getElementById('detail-payment-badge');
        paymentBadge.innerText = order.payment_status || 'Payment pending';
        paymentBadge.className = 'status-badge ' + (order.payment_status === 'Paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200');

        const fulfillmentBadge = document.getElementById('detail-fulfillment-badge');
        fulfillmentBadge.innerText = order.status === 'Delivered' ? 'Fulfilled' : 'Unfulfilled';
        fulfillmentBadge.className = 'status-badge ' + (order.status === 'Delivered' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200');

        document.getElementById('fulfillment-card-title').innerText = (order.status === 'Delivered' ? 'Fulfilled' : 'Unfulfilled') + ' (' + items.length + ')';
        const itemsList = document.getElementById('detail-items-list');
        itemsList.innerHTML = items.map(item => \`<div class="flex items-center justify-between"><div class="flex items-center gap-3"><img src="\${item.image || '/assets/images/placeholder.png'}" class="w-10 h-10 rounded border border-gray-100 object-cover"><div><p class="text-sm font-medium text-blue-600 hover:underline cursor-pointer">\${item.name}</p><p class="text-[11px] text-gray-400">SKU: --- / Default Title</p></div></div><div class="text-sm"><span class="text-gray-500">Rs. \${parseFloat(item.price).toFixed(2)} × \${item.quantity}</span><span class="ml-4 font-medium text-gray-800">Rs. \${(item.price * item.quantity).toFixed(2)}</span></div></div>\`).join('');

        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        document.getElementById('detail-subtotal-label').innerText = 'Subtotal (' + items.length + ' item' + (items.length !== 1 ? 's' : '') + ')';
        document.getElementById('detail-subtotal-value').innerText = 'Rs. ' + subtotal.toFixed(2);
        document.getElementById('detail-shipping-value').innerText = 'Rs. ' + parseFloat(order.delivery_charge || 0).toFixed(2);
        document.getElementById('detail-total-value').innerText = 'Rs. ' + parseFloat(order.total_amount).toFixed(2);
        
        const isPaid = order.payment_status === 'Paid';
        document.getElementById('detail-paid-value').innerText = 'Rs. ' + (isPaid ? order.total_amount.toFixed(2) : '0.00');
        document.getElementById('detail-balance-value').innerText = 'Rs. ' + (isPaid ? '0.00' : order.total_amount.toFixed(2));

        document.getElementById('sidebar-customer-name').innerText = order.fullname;
        document.getElementById('sidebar-customer-email').innerText = order.email || 'No email provided';
        document.getElementById('sidebar-customer-phone').innerText = order.phone;
        
        const addrLines = order.address.split(',').map(l => l.trim());
        document.getElementById('sidebar-shipping-address').innerHTML = order.fullname + '<br>' + addrLines.join('<br>');

        const timelineHistory = document.getElementById('detail-timeline-history');
        timelineHistory.innerHTML = tracking.map(t => \`<div class="relative pb-6 last:pb-0"><div class="absolute -left-[26px] mt-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white"></div><div class="flex justify-between items-start"><div><p class="text-sm font-bold text-gray-800">\${t.status}</p>\${t.note ? \`<p class="text-xs text-pink-500 mt-1 italic">"\${t.note}"</p>\` : ''}</div><span class="text-[10px] text-gray-400">\${new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>\`).reverse().join(''); 

        toggleModal('orderDetailModal');
    } catch (err) {
        console.error(err);
        alert('Could not load order details.');
    }
}

function getOrderStatusColor(status) {
    switch (status) {
        case 'Order Placed': return 'bg-pink-100 text-pink-700';
        case 'Processing': return 'bg-yellow-100 text-yellow-700';
        case 'Shipped': return 'bg-blue-100 text-blue-700';
        case 'Out for Delivery': return 'bg-indigo-100 text-indigo-700';
        case 'Delivered': return 'bg-green-100 text-green-700';
        case 'Cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

async function addTimelineComment() {
    const note = document.getElementById('timeline-comment').value;
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!note.trim()) return;
    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Internal Note', note: note })
        });
        if (res.ok) {
            document.getElementById('timeline-comment').value = '';
            openOrderDetail(orderId); 
        }
    } catch (err) {
        console.error(err);
    }
}
`;

fs.writeFileSync('admin/js/admin.js', restoredLines.join('\n') + newCode);
console.log('admin.js updated successfully');
