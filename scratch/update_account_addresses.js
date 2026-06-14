const fs = require('fs');
const path = require('path');

const accountPath = path.join(__dirname, '..', 'account.html');
let html = fs.readFileSync(accountPath, 'utf8');

// 1. Add the Nav Button back
const navOrdersBtn = `<button id="tab-orders" onclick="switchTab('orders')" class="w-full text-left px-4 py-3 rounded-xl bg-pink-50 text-pink-600 font-bold flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    My Orders
                </button>`;

const newNav = `<button id="tab-orders" onclick="switchTab('orders')" class="w-full text-left px-4 py-3 rounded-xl bg-pink-50 text-pink-600 font-bold flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    My Orders
                </button>
                <button id="tab-addresses" onclick="switchTab('addresses')" class="w-full text-left px-4 py-3 rounded-xl text-gray-500 font-medium hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Saved Addresses
                </button>`;

if (html.includes(navOrdersBtn) && !html.includes('id="tab-addresses"')) {
    html = html.replace(navOrdersBtn, newNav);
} else {
    // try to find the previous one if it exists but different
    html = html.replace(/<button class="w-full text-left px-4 py-3 rounded-xl bg-pink-50 text-pink-600 font-bold flex items-center gap-3 transition-colors">([\s\S]*?)<\/button>/, newNav);
}

// 2. Wrap Order History in a section and add Addresses section
const mainContentStart = `<div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Order History</h2>`;

const wrapperReplacement = `<div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 relative min-h-[500px]">
                
                <!-- ORDERS SECTION -->
                <div id="section-orders">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">Order History</h2>`;

if (html.includes(mainContentStart)) {
    html = html.replace(mainContentStart, wrapperReplacement);
    
    // Find the end of orders container
    const ordersEnd = `</div>
            </div>
        </div>
    </main>`;
    
    const addressesHTML = `</div>
                
                <!-- ADDRESSES SECTION -->
                <div id="section-addresses" class="hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Saved Addresses</h2>
                        <button onclick="openAddressModal()" class="px-4 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Add New
                        </button>
                    </div>
                    
                    <div id="addresses-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Addresses injected here -->
                    </div>
                </div>

            </div>
        </div>
    </main>`;
    
    html = html.replace(ordersEnd, addressesHTML);
}

// 3. Add Address Modal HTML
const modalHTML = `
    <!-- Address Modal -->
    <div id="addressModal" class="fixed inset-0 bg-black/60 hidden flex items-center justify-center z-[120] p-4 modal-blur">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-zoom-in overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="font-bold text-gray-900 text-lg">Add New Address</h3>
                <button onclick="closeAddressModal()" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <form id="addressForm" onsubmit="saveAddress(event)" class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">First Name</label>
                        <input type="text" id="addr_fname" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">Last Name</label>
                        <input type="text" id="addr_lname" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
                    <input type="tel" id="addr_phone" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">House/Flat No.</label>
                    <input type="text" id="addr_house" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">Society/Area</label>
                        <input type="text" id="addr_society" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">City</label>
                        <input type="text" id="addr_city" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">State</label>
                        <input type="text" id="addr_state" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">Pincode</label>
                        <input type="text" id="addr_pincode" required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="addr_default" class="rounded text-pink-500 focus:ring-pink-500">
                    <label for="addr_default" class="text-sm text-gray-700">Set as default address</label>
                </div>
                <div class="pt-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" class="px-6 py-2.5 bg-pink-500 text-white font-bold rounded-xl text-sm hover:bg-pink-600 transition w-full">Save Address</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>`;

if (!html.includes('id="addressModal"')) {
    html = html.replace('<script>', modalHTML);
}

// 4. JS functions for tabs and addresses
const jsFunctions = `
        function switchTab(tabId) {
            const btnOrders = document.getElementById('tab-orders');
            const btnAddresses = document.getElementById('tab-addresses');
            const secOrders = document.getElementById('section-orders');
            const secAddresses = document.getElementById('section-addresses');
            
            const activeClass = ['bg-pink-50', 'text-pink-600', 'font-bold'];
            const inactiveClass = ['text-gray-500', 'font-medium', 'hover:bg-gray-50'];

            if (tabId === 'orders') {
                btnOrders.classList.add(...activeClass);
                btnOrders.classList.remove(...inactiveClass);
                btnAddresses.classList.remove(...activeClass);
                btnAddresses.classList.add(...inactiveClass);
                
                secOrders.classList.remove('hidden');
                secAddresses.classList.add('hidden');
            } else if (tabId === 'addresses') {
                btnAddresses.classList.add(...activeClass);
                btnAddresses.classList.remove(...inactiveClass);
                btnOrders.classList.remove(...activeClass);
                btnOrders.classList.add(...inactiveClass);
                
                secAddresses.classList.remove('hidden');
                secOrders.classList.add('hidden');
                
                fetchAddresses();
            }
        }

        async function fetchAddresses() {
            try {
                const res = await fetch(\`/api/addresses?user_id=\${currentUser.id}\`);
                const addresses = await res.json();
                const container = document.getElementById('addresses-container');
                
                if (!addresses || addresses.length === 0) {
                    container.innerHTML = \`<div class="col-span-2 text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p class="text-gray-500 font-medium">No saved addresses found.</p>
                    </div>\`;
                    return;
                }
                
                container.innerHTML = addresses.map(addr => \`
                    <div class="border \${addr.is_default ? 'border-pink-300 bg-pink-50/30' : 'border-gray-200'} rounded-2xl p-5 relative group">
                        \${addr.is_default ? '<span class="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest bg-pink-100 text-pink-600 px-2 py-0.5 rounded">Default</span>' : ''}
                        <h4 class="font-bold text-gray-900 mb-1">\${addr.fullname}</h4>
                        <p class="text-xs text-gray-600 leading-relaxed max-w-[80%]">
                            \${addr.house_no}, \${addr.society}<br>
                            \${addr.city}, \${addr.state} - \${addr.pincode}
                        </p>
                        <p class="text-xs font-bold text-gray-800 mt-3">📞 \${addr.phone}</p>
                        <div class="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="deleteAddress(\${addr.id})" class="text-xs text-red-500 font-bold hover:underline">Delete</button>
                        </div>
                    </div>
                \`).join('');
                
            } catch (err) {
                console.error(err);
            }
        }

        function openAddressModal() {
            document.getElementById('addressForm').reset();
            document.getElementById('addressModal').classList.remove('hidden');
        }

        function closeAddressModal() {
            document.getElementById('addressModal').classList.add('hidden');
        }

        async function saveAddress(e) {
            e.preventDefault();
            const payload = {
                user_id: currentUser.id,
                first_name: document.getElementById('addr_fname').value,
                last_name: document.getElementById('addr_lname').value,
                phone: document.getElementById('addr_phone').value,
                house_no: document.getElementById('addr_house').value,
                society: document.getElementById('addr_society').value,
                street: '',
                landmark: '',
                city: document.getElementById('addr_city').value,
                state: document.getElementById('addr_state').value,
                pincode: document.getElementById('addr_pincode').value,
                is_default: document.getElementById('addr_default').checked ? 1 : 0
            };
            
            try {
                const res = await fetch('/api/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    closeAddressModal();
                    fetchAddresses();
                } else {
                    alert('Failed to save address');
                }
            } catch (err) {
                console.error(err);
            }
        }
        
        async function deleteAddress(id) {
            if(!confirm('Delete this address?')) return;
            try {
                const res = await fetch('/api/addresses/' + id, { method: 'DELETE' });
                if (res.ok) fetchAddresses();
            } catch(e) { console.error(e); }
        }

`;

if (!html.includes('function switchTab')) {
    html = html.replace('<script>', '<script>\n' + jsFunctions);
}

fs.writeFileSync(accountPath, html);
console.log("Successfully updated account.html");
