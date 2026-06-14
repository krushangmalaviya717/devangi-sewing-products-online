function switchTab(tabId) {
    const tabQueries = document.getElementById('tab-queries');
    const tabSettings = document.getElementById('tab-settings');
    const secQueries = document.getElementById('section-queries');
    const secSettings = document.getElementById('section-settings');

    if (tabId === 'queries') {
        tabQueries.className = 'px-4 py-2 text-pink-600 border-b-2 border-pink-600 font-medium';
        tabSettings.className = 'px-4 py-2 text-gray-500 hover:text-gray-700 font-medium border-b-2 border-transparent';
        secQueries.classList.remove('hidden');
        secSettings.classList.add('hidden');
        fetchQueries();
    } else {
        tabSettings.className = 'px-4 py-2 text-pink-600 border-b-2 border-pink-600 font-medium';
        tabQueries.className = 'px-4 py-2 text-gray-500 hover:text-gray-700 font-medium border-b-2 border-transparent';
        secSettings.classList.remove('hidden');
        secQueries.classList.add('hidden');
        fetchSettings();
    }
}

async function fetchQueries() {
    try {
        const tbody = document.getElementById('queries-table-body');
        if (!tbody) return;

        const status = document.getElementById('query-status-filter')?.value || '';
        const month = document.getElementById('query-month-filter')?.value || '';
        const year = document.getElementById('query-year-filter')?.value || '';

        const res = await fetch(`/api/admin/contact?status=${status}&month=${month}&year=${year}`);
        const queries = await res.json();

        tbody.innerHTML = '';
        if (!queries || queries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">No contact queries found.</td></tr>`;
            return;
        }

        queries.forEach(q => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
            
            const shortMsg = q.message.length > 50 ? q.message.substring(0, 50) + '...' : q.message;
            const isResolved = q.status === 'Resolved';
            
            tr.innerHTML = `
                <td class="p-4 font-medium text-gray-500">#${q.id}</td>
                <td class="p-4">
                    <p class="font-bold text-gray-800"><a href="user_details.html?email=${encodeURIComponent(q.email)}" class="hover:text-pink-600 hover:underline" title="View User Details">${q.name}</a></p>
                    <p class="text-xs text-gray-500"><a href="user_details.html?email=${encodeURIComponent(q.email)}" class="text-pink-500 hover:underline" title="View User Details">${q.email}</a></p>
                    <p class="text-[10px] text-gray-400 mt-1">${new Date(q.created_at).toLocaleString()}</p>
                </td>
                <td class="p-4 text-xs">
                    <p><span class="font-semibold text-gray-600">Order:</span> ${q.order_status || 'N/A'}</p>
                    <p><span class="font-semibold text-gray-600">Delivery:</span> ${q.delivery_related || 'N/A'}</p>
                </td>
                <td class="p-4">
                    <p class="text-gray-600 text-sm italic cursor-pointer hover:text-pink-600" onclick="viewMessage(\`${q.message.replace(/`/g, "'")}\`)">"${shortMsg}"</p>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 text-xs rounded-full font-medium ${isResolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                        ${q.status}
                    </span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="toggleStatus(${q.id}, '${q.status}')" class="px-3 py-1 text-xs font-semibold rounded border ${isResolved ? 'border-yellow-500 text-yellow-600 hover:bg-yellow-50' : 'border-green-500 text-green-600 hover:bg-green-50'} transition-colors">
                        Mark as ${isResolved ? 'Pending' : 'Resolved'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching queries:', err);
    }
}

async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Resolved' ? 'Pending' : 'Resolved';
    try {
        const res = await fetch(`/api/admin/contact/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast(`Query marked as ${newStatus}`);
            fetchQueries();
        }
    } catch (err) {
        console.error(err);
    }
}

function viewMessage(fullMessage) {
    document.getElementById('queryModalContent').textContent = fullMessage;
    toggleModal('queryModal');
}

async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        
        document.getElementById('setting_location').value = data.store_location || '';
        document.getElementById('setting_phone').value = data.store_phone || '';
        document.getElementById('setting_email').value = data.store_email || '';
        
        if (data.contact_form_options) {
            try {
                const opts = JSON.parse(data.contact_form_options);
                if (opts.order_status) document.getElementById('setting_order_status').value = opts.order_status.join(', ');
                if (opts.delivery_related) document.getElementById('setting_delivery_related').value = opts.delivery_related.join(', ');
            } catch (e) {
                console.error("Parse error", e);
            }
        }
    } catch (err) {
        console.error('Error fetching settings:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    fetchQueries();

    // Form submission
    const form = document.getElementById('settingsForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const store_location = document.getElementById('setting_location').value;
            const store_phone = document.getElementById('setting_phone').value;
            const store_email = document.getElementById('setting_email').value;
            
            const osText = document.getElementById('setting_order_status').value;
            const drText = document.getElementById('setting_delivery_related').value;
            
            const contact_form_options = {
                order_status: osText.split(',').map(s => s.trim()).filter(Boolean),
                delivery_related: drText.split(',').map(s => s.trim()).filter(Boolean)
            };
            
            const payload = {
                store_location,
                store_phone,
                store_email,
                contact_form_options
            };
            
            try {
                const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    showToast('Settings saved successfully! ✅');
                } else {
                    alert('Failed to save settings.');
                }
            } catch (err) {
                console.error(err);
                alert('Error saving settings.');
            }
        });
    }
});
