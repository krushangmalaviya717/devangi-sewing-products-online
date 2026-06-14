document.addEventListener('DOMContentLoaded', () => {
    // Get email from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    if (!email) {
        alert('No user email provided.');
        window.location.href = 'users.html';
        return;
    }
    
    fetchUserDetails(email);
});

async function fetchUserDetails(email) {
    try {
        const response = await fetch(`/api/admin/user-details/${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error('Failed to fetch user details');
        
        const data = await response.json();
        const user = data.user;
        const orders = data.orders || [];
        
        // Render Profile
        document.getElementById('user-name').textContent = user.fullname || 'Unknown';
        document.getElementById('user-email-link').textContent = user.email;
        document.getElementById('user-email-link').href = `mailto:${user.email}`;
        
        if (user.phone) {
            document.getElementById('user-phone').textContent = user.phone;
        }
        
        const roleBadge = document.getElementById('user-role-badge');
        roleBadge.classList.remove('hidden');
        if (user.is_guest) {
            roleBadge.textContent = 'Guest';
            roleBadge.className = 'px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full';
        } else {
            roleBadge.textContent = 'Registered';
            roleBadge.className = 'px-2 py-1 bg-pink-100 text-pink-600 text-xs rounded-full';
            document.getElementById('user-joined-container').classList.remove('hidden');
            document.getElementById('user-joined').textContent = new Date(user.created_at).toLocaleDateString();
        }
        
        // Render Stats
        document.getElementById('stat-total-orders').textContent = orders.length;
        
        let completed = 0;
        let pending = 0;
        let totalSpent = 0;
        
        orders.forEach(order => {
            if (order.status === 'Completed' || order.status === 'Delivered') completed++;
            else if (order.status !== 'Cancelled') pending++;
            
            if (order.status !== 'Cancelled') {
                totalSpent += parseFloat(order.total_amount || 0);
            }
        });
        
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-total-spent').textContent = `₹${totalSpent.toFixed(2)}`;
        
        // Render Orders Table
        const tbody = document.getElementById('orders-table-body');
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">No past orders found for this user.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            const statusClass = order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800';
            
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-medium text-pink-600">#${order.id}</td>
                <td class="p-4">${date}</td>
                <td class="p-4 font-semibold">₹${parseFloat(order.total_amount).toFixed(2)}</td>
                <td class="p-4">
                    <div class="text-xs ${order.payment_status === 'Paid' ? 'text-green-600' : 'text-gray-500'} font-medium">
                        ${order.payment_method} <br>
                        ${order.payment_status}
                    </div>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${order.status}
                    </span>
                </td>
                <td class="p-4">
                    <a href="javascript:void(0)" onclick="viewOrder(${order.id})" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View details</a>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (err) {
        console.error(err);
        document.getElementById('orders-table-body').innerHTML = `
            <tr><td colspan="6" class="p-8 text-center text-red-500">Failed to load details.</td></tr>
        `;
    }
}

// Global func so inline onclick works
window.viewOrder = function(orderId) {
    window.location.href = `orders.html?open_order=${orderId}`;
}
