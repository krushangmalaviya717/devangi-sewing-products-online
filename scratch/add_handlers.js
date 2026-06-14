const fs = require('fs');
const content = fs.readFileSync('admin/js/admin.js', 'utf8');

const newCode = `
async function updateOrderStatus(newStatus) {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!confirm('Update order status to ' + newStatus + '?')) return;
    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast('Order ' + newStatus + '! ✅');
            openOrderDetail(orderId);
            loadOrders();
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateOrderPayment(newStatus) {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!confirm('Mark this order as ' + newStatus + '?')) return;
    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast('Payment ' + newStatus + '! ✅');
            openOrderDetail(orderId);
            loadOrders();
        }
    } catch (err) {
        console.error(err);
    }
}
`;

fs.appendFileSync('admin/js/admin.js', newCode);
console.log('admin.js updated with interactive handlers');
