
        let currentUser = JSON.parse(localStorage.getItem('anon_user'));
        const isGuest = sessionStorage.getItem('guest_checkout') === 'true';
        
        // Detect Buy Now mode
        const urlParams = new URLSearchParams(window.location.search);
        const isBuyNow = urlParams.get('buynow') === '1';
        
        let cartItems;
        if (isBuyNow) {
            // Only show the single Buy Now product — never touch the cart
            cartItems = JSON.parse(sessionStorage.getItem('buy_now_cart')) || [];
        } else {
            cartItems = JSON.parse(localStorage.getItem('anon_cart')) || [];
        }
        
        let selectedAddressId = null;
        let selectedPaymentMethod = 'COD';
        let savedAddresses = [];
        let appliedCoupon = null;
        let chargeGujarat = 50;
        let chargeMaharashtra = 60;
        let chargeOthers = 100;
        let shippingFreeAbove = 250;
        let shippingCharge = 100;
        let whatsappOrderNumber = '';

        document.addEventListener('DOMContentLoaded', () => {
            if (cartItems.length === 0) {
                window.location.href = '/index.html';
                return;
            }

            renderOrderSummary();
            loadSavedAddresses();
            loadShippingSettings();
            selectPaymentMethod('COD');
            validateForm();

            // Add More Items link: hide in Buy Now mode, point to cart in normal mode
            const addMoreRow = document.getElementById('add-more-row');
            const addMoreLink = document.getElementById('add-more-link');
            if (isBuyNow) {
                if (addMoreRow) addMoreRow.classList.add('hidden');
            } else {
                if (addMoreLink) addMoreLink.href = '/cart.html';
            }

            // Background Geolocation
            autoDetectLocation();
            
            // Sync checkbox with label visibility
            const saveCheck = document.getElementById('save-address-check');
            if (saveCheck) {
                saveCheck.addEventListener('change', function() {
                    const labelContainer = document.getElementById('label-container');
                    const addrLabel = document.getElementById('addr-label');
                    if (labelContainer) labelContainer.style.opacity = this.checked ? "1" : "0.3";
                    if (addrLabel) addrLabel.disabled = !this.checked;
                });
            }

            // Real-time validation and shipping charge updates as user types
            const phoneInput = document.getElementById('addr-phone');
            const pinInput = document.getElementById('addr-pincode');
            if (phoneInput) {
                phoneInput.addEventListener('input', validateForm);
            }
            if (pinInput) {
                pinInput.addEventListener('input', () => {
                    const pin = pinInput.value.trim();
                    if (pin.length >= 2) {
                        const detectedState = getStateFromPincode(pin);
                        if (detectedState) {
                            const stateInput = document.getElementById('addr-state');
                            if (stateInput) stateInput.value = detectedState;
                        }
                    }
                    validateForm();
                    renderOrderSummary();
                });
            }
        });

        function renderOrderSummary() {
            const container = document.getElementById('cart-summary-items');
            container.innerHTML = '';
            cartItems.forEach(item => {
                container.innerHTML += `
                    <div class="flex gap-4">
                        <img src="${item.image}" class="w-12 h-12 rounded-lg object-cover border border-gray-100">
                        <div class="flex-grow">
                            <p class="text-sm font-bold text-gray-800 line-clamp-1">${item.title || item.name}</p>
                            <p class="text-xs text-gray-400">Qty: ${item.quantity} × Rs. ${item.price.toFixed(2)}</p>
                        </div>
                    </div>
                `;
            });
            const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            document.getElementById('summary-subtotal').innerText = `Rs. ${subtotal.toFixed(2)}`;
            
            // Calculate dynamic shipping charge based on pincode
            let pincode = '';
            if (selectedAddressId) {
                const addr = savedAddresses.find(a => a.id === selectedAddressId);
                if (addr) pincode = addr.pincode || '';
            } else {
                const pinInput = document.getElementById('addr-pincode');
                if (pinInput) pincode = pinInput.value.trim();
            }

            // Declare isPincodeValid BEFORE the if check
            const isPincodeValid = /^[1-9][0-9]{5}$/.test(pincode);

            // Helper: show the free-shipping nudge bar
            function showFsNudge() {
                const fsNotice = document.getElementById('free-shipping-notice');
                if (!fsNotice) return;
                if (subtotal < shippingFreeAbove) {
                    const diff = shippingFreeAbove - subtotal;
                    const pct = Math.min(100, Math.round((subtotal / shippingFreeAbove) * 100));
                    document.getElementById('free-shipping-diff').textContent = `Rs. ${diff.toFixed(2)}`;
                    const bar = document.getElementById('free-shipping-bar');
                    if (bar) bar.style.width = pct + '%';
                    fsNotice.classList.remove('hidden');
                } else {
                    fsNotice.classList.add('hidden');
                }
            }

            // Helper: update coupon row
            function updateCouponRow() {
                if (appliedCoupon) {
                    if (appliedCoupon.is_free_shipping) {
                        document.getElementById('coupon-discount-row').classList.remove('hidden');
                        document.getElementById('summary-coupon-discount').textContent = 'Free Shipping';
                    } else {
                        document.getElementById('coupon-discount-row').classList.remove('hidden');
                        document.getElementById('summary-coupon-discount').textContent = `- Rs. ${appliedCoupon.discount.toFixed(2)}`;
                    }
                } else {
                    document.getElementById('coupon-discount-row').classList.add('hidden');
                }
            }

            // If no valid pincode yet — show "Enter address" placeholder
            if (!pincode || !isPincodeValid) {
                shippingCharge = 0;
                const shippingEl = document.getElementById('summary-shipping');
                shippingEl.textContent = 'Enter address';
                shippingEl.className = 'text-gray-400 font-medium text-xs italic';

                const couponDiscountVal = (appliedCoupon && !appliedCoupon.is_free_shipping) ? appliedCoupon.discount : 0;
                document.getElementById('summary-total').innerText = `Rs. ${(subtotal - couponDiscountVal).toFixed(2)} + Shipping`;

                showFsNudge();
                updateCouponRow();
                return;
            }

            // ── Pincode detected → calculate exact shipping ────────────────────
            const prefix2 = pincode.substring(0, 2);
            const prefix3 = pincode.substring(0, 3);

            // Gujarat: pincodes starting 36-39
            let currentShipping = chargeOthers;
            if (['36','37','38','39'].includes(prefix2)) {
                currentShipping = chargeGujarat;
            } else if (['40','41','42','43','44'].includes(prefix2) && prefix3 !== '403') {
                currentShipping = chargeMaharashtra;
            }

            shippingCharge = subtotal >= shippingFreeAbove ? 0 : currentShipping;
            if (appliedCoupon && appliedCoupon.is_free_shipping) {
                shippingCharge = 0;
            }
            const shippingEl = document.getElementById('summary-shipping');
            if (shippingCharge > 0) {
                shippingEl.textContent = `Rs. ${shippingCharge}`;
                shippingEl.className = 'text-gray-700 font-medium';
            } else {
                shippingEl.textContent = 'FREE';
                shippingEl.className = 'text-green-500 font-bold';
            }

            // Free Shipping Notice Progress
            const fsNotice = document.getElementById('free-shipping-notice');
            if (fsNotice) {
                if (shippingCharge > 0 && subtotal < shippingFreeAbove) {
                    const diff = shippingFreeAbove - subtotal;
                    const pct = Math.min(100, Math.round((subtotal / shippingFreeAbove) * 100));
                    document.getElementById('free-shipping-diff').textContent = `Rs. ${diff.toFixed(2)}`;
                    const bar = document.getElementById('free-shipping-bar');
                    if (bar) bar.style.width = pct + '%';
                    fsNotice.classList.remove('hidden');
                } else {
                    fsNotice.classList.add('hidden');
                }
            }

            // Coupon discount
            let couponDiscount = 0;
            if (appliedCoupon) {
                if (appliedCoupon.is_free_shipping) {
                    couponDiscount = 0;
                    document.getElementById('coupon-discount-row').classList.remove('hidden');
                    document.getElementById('summary-coupon-discount').textContent = `Free Shipping`;
                } else {
                    couponDiscount = appliedCoupon.discount;
                    document.getElementById('coupon-discount-row').classList.remove('hidden');
                    document.getElementById('summary-coupon-discount').textContent = `- Rs. ${couponDiscount.toFixed(2)}`;
                }
            } else {
                document.getElementById('coupon-discount-row').classList.add('hidden');
            }

            const total = subtotal + shippingCharge - couponDiscount;
            document.getElementById('summary-total').innerText = `Rs. ${total.toFixed(2)}`;
        }

        async function loadSavedAddresses() {
            if (!currentUser) {
                document.getElementById('saved-addresses-section').classList.add('hidden');
                document.getElementById('address-form-section').classList.remove('hidden');
                
                // Hide save address checkbox for guest users
                const saveAddressWrapper = document.getElementById('save-address-check')?.closest('.flex');
                if (saveAddressWrapper) {
                    saveAddressWrapper.classList.add('hidden');
                    document.getElementById('save-address-check').checked = false;
                }
                return;
            }
            try {
                const res = await fetch(`/api/addresses?user_id=${currentUser.id}`);
                savedAddresses = await res.json();
                if (savedAddresses.length > 0) {
                    document.getElementById('saved-addresses-section').classList.remove('hidden');
                    renderAddressesList();
                    const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
                    selectSavedAddress(defaultAddr.id);
                } else {
                    document.getElementById('address-form-section').classList.remove('hidden');
                }
            } catch (err) { console.error(err); }
        }

        function renderAddressesList() {
            const container = document.getElementById('addresses-list');
            container.innerHTML = '';
            savedAddresses.forEach(addr => {
                container.innerHTML += `
                    <div onclick="selectSavedAddress(${addr.id})" id="addr-card-${addr.id}" class="address-card border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-pink-200 transition-all relative">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-[9px] font-bold uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded text-pink-500">${addr.nickname || 'Address'}</span>
                            ${addr.is_default ? '<span class="text-[9px] text-green-500 font-bold uppercase">Default</span>' : ''}
                        </div>
                        <p class="font-bold text-sm text-gray-800">${addr.fullname}</p>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">${addr.house_no}, ${addr.society}, ${addr.street || ''}, ${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}</p>
                        <p class="text-[11px] text-gray-400 mt-1">${addr.phone}</p>
                    </div>
                `;
            });
        }

        function selectSavedAddress(id) {
            selectedAddressId = id;
            document.querySelectorAll('.address-card').forEach(el => el.classList.remove('selected'));
            document.getElementById(`addr-card-${id}`)?.classList.add('selected');
            document.getElementById('address-form-section').classList.add('hidden');
            validateForm();
            renderOrderSummary();
        }

        function showNewAddressForm() {
            selectedAddressId = null;
            document.querySelectorAll('.address-card').forEach(el => el.classList.remove('selected'));
            document.getElementById('address-form-section').classList.remove('hidden');
            document.getElementById('address-form').reset();
            const names = (currentUser ? currentUser.fullname || '' : '').split(' ');
            document.getElementById('addr-firstname').value = names[0] || '';
            document.getElementById('addr-lastname').value = names.slice(1).join(' ') || '';
            validateForm();
            renderOrderSummary();
        }

        function getStateFromPincode(pincode) {
            if (!pincode || pincode.length < 2) return '';
            const prefix2 = pincode.substring(0, 2);
            const prefix3 = pincode.substring(0, 3);
            
            if (prefix3 === '403') return 'Goa';
            if (prefix3 === '160') return 'Chandigarh';
            if (prefix3 === '605') return 'Puducherry';
            if (prefix3 === '737') return 'Sikkim';
            if (prefix3 === '744') return 'Andaman & Nicobar Islands';
            
            if (prefix3 === '248' || prefix3 === '249' || prefix3 === '263') return 'Uttarakhand';
            
            if (['814', '815', '816', '822', '825', '826', '827', '828', '829', '831', '832', '833', '834', '835'].includes(prefix3)) {
                return 'Jharkhand';
            }
            
            if (prefix2 === '79') {
                if (prefix3 === '790' || prefix3 === '791' || prefix3 === '792') return 'Arunachal Pradesh';
                if (prefix3 === '793' || prefix3 === '794') return 'Meghalaya';
                if (prefix3 === '795') return 'Manipur';
                if (prefix3 === '796') return 'Mizoram';
                if (prefix3 === '797' || prefix3 === '798') return 'Nagaland';
                if (prefix3 === '799') return 'Tripura';
                return 'Northeast State';
            }

            const stateMap = {
                '11': 'Delhi',
                '12': 'Haryana', '13': 'Haryana',
                '14': 'Punjab', '15': 'Punjab',
                '17': 'Himachal Pradesh',
                '18': 'Jammu and Kashmir', '19': 'Jammu and Kashmir',
                '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Uttar Pradesh', '24': 'Uttar Pradesh', '25': 'Uttar Pradesh', '26': 'Uttar Pradesh', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
                '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan', '33': 'Rajasthan', '34': 'Rajasthan',
                '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat', '39': 'Gujarat',
                '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra',
                '45': 'Madhya Pradesh', '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh',
                '49': 'Chhattisgarh',
                '50': 'Telangana',
                '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
                '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
                '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
                '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
                '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal', '73': 'West Bengal', '74': 'West Bengal',
                '75': 'Odisha', '76': 'Odisha', '77': 'Odisha',
                '78': 'Assam',
                '80': 'Bihar', '81': 'Bihar', '82': 'Bihar', '83': 'Bihar', '84': 'Bihar', '85': 'Bihar'
            };

            return stateMap[prefix2] || '';
        }

        function validateForm() {
            const btn = document.getElementById('main-place-btn');
            if (selectedAddressId) {
                btn.disabled = false;
                return;
            }

            const phone = document.getElementById('addr-phone').value;
            const pincode = document.getElementById('addr-pincode').value;
            
            const isPhoneValid = /^[0-9]{10}$/.test(phone);
            const isPincodeValid = /^[1-9][0-9]{5}$/.test(pincode);
            
            document.getElementById('phone-error').style.display = (phone && !isPhoneValid) ? "block" : "none";
            document.getElementById('pincode-error').style.display = (pincode && !isPincodeValid) ? "block" : "none";

            const form = document.getElementById('address-form');
            btn.disabled = !form.checkValidity() || !isPhoneValid || !isPincodeValid;
        }

        async function autoDetectLocation() {
            const status = document.getElementById('location-status');
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
                        const data = await res.json();
                        document.getElementById('addr-city').value = data.city || data.locality || '';
                        document.getElementById('addr-state').value = data.principalSubdivision || '';
                        document.getElementById('addr-pincode').value = data.postcode || '';
                        status.innerText = "Location detected: " + (data.city || data.locality);
                        validateForm();
                    } catch (e) { status.innerText = ""; }
                }, () => { status.innerText = ""; });
            }
        }

        function selectPaymentMethod(method) {
            selectedPaymentMethod = method;
            document.querySelectorAll('.payment-card').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.payment-card .w-3').forEach(el => el.classList.add('opacity-0'));
            const btn = document.getElementById('main-place-btn');
            if (method === 'COD') {
                document.getElementById('pay-cod').classList.add('selected');
                document.getElementById('check-cod').querySelector('.w-3').classList.remove('opacity-0');
                btn.innerText = 'Place Order (COD)';
            } else if (method === 'WHATSAPP') {
                document.getElementById('pay-whatsapp').classList.add('selected');
                document.getElementById('check-whatsapp').querySelector('.w-3').classList.remove('opacity-0');
                btn.innerText = '💬 Order via WhatsApp';
            } else {
                document.getElementById('pay-online').classList.add('selected');
                document.getElementById('check-online').querySelector('.w-3').classList.remove('opacity-0');
                btn.innerText = 'Pay & Place Order';
            }
        }

        async function processOrderPlacement() {
            const btn = document.getElementById('main-place-btn');
            let addressData = {};

            if (selectedAddressId) {
                const saved = savedAddresses.find(a => a.id === selectedAddressId);
                addressData = { ...saved, label: saved.nickname };
            } else {
                addressData = {
                    first_name: document.getElementById('addr-firstname').value,
                    last_name: document.getElementById('addr-lastname').value,
                    phone: document.getElementById('addr-phone').value,
                    house_no: document.getElementById('addr-house').value,
                    society: document.getElementById('addr-society').value,
                    street: document.getElementById('addr-street').value,
                    landmark: document.getElementById('addr-landmark').value,
                    city: document.getElementById('addr-city').value,
                    state: document.getElementById('addr-state').value,
                    pincode: document.getElementById('addr-pincode').value,
                    label: document.getElementById('addr-label').value
                };

                if (document.getElementById('save-address-check').checked) {
                    await fetch('/api/addresses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...addressData, user_id: currentUser ? currentUser.id : null, nickname: addressData.label })
                    });
                }
            }

            const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const actualShipping = subtotal >= shippingFreeAbove ? 0 : shippingCharge;
            const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
            const total = subtotal + actualShipping - couponDiscount;
            if (selectedPaymentMethod === 'ONLINE') handleRazorpayPayment(addressData, total);
            else if (selectedPaymentMethod === 'WHATSAPP') placeWhatsAppOrder(addressData, total);
            else placeOrder(addressData, total, 'COD');
        }

        async function placeWhatsAppOrder(addressData, total) {
            const btn = document.getElementById('main-place-btn');
            btn.disabled = true;
            btn.innerText = 'Processing...';

            const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const actualShipping = subtotal >= shippingFreeAbove ? 0 : shippingCharge;
            const fullAddr = `${addressData.house_no}, ${addressData.society}, ${addressData.street}, ${addressData.landmark ? addressData.landmark + ', ' : ''}${addressData.city}, ${addressData.state} - ${addressData.pincode}`;
            const customerName = `${addressData.first_name} ${addressData.last_name}`;

            // Place order in database first (like COD)
            const orderData = {
                user_id: currentUser ? currentUser.id : null,
                first_name: addressData.first_name,
                last_name: addressData.last_name,
                fullname: customerName,
                phone: addressData.phone,
                email: currentUser ? currentUser.email : "",
                total_amount: total,
                delivery_charge: actualShipping,
                address: fullAddr,
                house_no: addressData.house_no,
                society: addressData.society,
                street: addressData.street,
                landmark: addressData.landmark,
                city: addressData.city,
                state: addressData.state,
                pincode: addressData.pincode,
                label: addressData.label || addressData.nickname,
                items: cartItems.map(item => ({ id: item.id, name: item.title || item.name, price: item.price, quantity: item.quantity, image: item.image })),
                payment_method: 'WhatsApp',
                transaction_id: null,
                payment_status: 'Pending'
            };

            try {
                const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
                if (res.ok) {
                    const resData = await res.json();
                    const orderId = resData.orderId;

                    // Track coupon usage
                    if (appliedCoupon && appliedCoupon.coupon_id) {
                        fetch(`/api/coupons/use/${appliedCoupon.coupon_id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: currentUser ? currentUser.id : null })
                        });
                    }

                    // Clear cart
                    if (isBuyNow) {
                        sessionStorage.removeItem('buy_now_cart');
                    } else {
                        localStorage.removeItem('anon_cart');
                    }

                    // Build WhatsApp message
                    let msg = `🛒 *New Order #${orderId}*\n\n`;
                    msg += `👤 *Customer:* ${customerName}\n`;
                    msg += `📞 *Phone:* ${addressData.phone}\n`;
                    msg += `📍 *Address:* ${fullAddr}\n\n`;
                    msg += `📦 *Order Items:*\n`;
                    cartItems.forEach((item, i) => {
                        const itemName = item.title || item.name;
                        msg += `${i + 1}. ${itemName} × ${item.quantity} = Rs. ${(item.price * item.quantity).toFixed(2)}\n`;
                    });
                    msg += `\n💰 *Subtotal:* Rs. ${subtotal.toFixed(2)}\n`;
                    msg += `🚚 *Shipping:* ${actualShipping === 0 ? 'FREE' : 'Rs. ' + actualShipping.toFixed(2)}\n`;
                    if (appliedCoupon) {
                        msg += `🎟️ *Coupon Discount:* -Rs. ${appliedCoupon.discount.toFixed(2)}\n`;
                    }
                    msg += `\n✅ *Total: Rs. ${total.toFixed(2)}*\n`;
                    msg += `\n💳 *Payment Method:* WhatsApp Order (Pay on Delivery)`;

                    // Get WhatsApp number from settings
                    const waNumber = whatsappOrderNumber || '919725340354';
                    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

                    // Show success modal
                    if (!currentUser) {
                        const phone = orderData.phone;
                        const trackingUrl = `/track-order.html?phone=${phone}&order_id=${orderId}`;
                        document.getElementById('success-msg').innerHTML = `Your order has been placed successfully.<br><br><span class="font-bold text-lg text-pink-600">Order ID: #${orderId}</span><br><span class="text-xs text-gray-400">Redirecting to WhatsApp...</span>`;
                        document.getElementById('success-modal-actions').innerHTML = `
                            <a href="${trackingUrl}" class="block w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition">Track Order Status</a>
                            <a href="/index.html" class="block w-full text-gray-500 py-2 text-sm font-medium hover:underline">Back to Home</a>
                        `;
                        sessionStorage.removeItem('guest_checkout');
                    } else {
                        document.getElementById('success-msg').innerHTML = `Your order has been placed successfully.<br><span class="text-xs text-gray-400">Redirecting to WhatsApp...</span>`;
                        document.getElementById('success-modal-actions').innerHTML = `
                            <a href="/account.html" class="block w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition">View My Orders</a>
                            <a href="/index.html" class="block w-full text-gray-500 py-2 text-sm font-medium hover:underline">Back to Home</a>
                        `;
                    }
                    document.getElementById('successModal').classList.remove('hidden');

                    // Redirect to WhatsApp after short delay
                    setTimeout(() => {
                        window.open(waUrl, '_blank');
                    }, 800);
                } else {
                    alert('Order failed.');
                }
            } catch (err) {
                alert('Network error.');
            } finally {
                btn.disabled = false;
            }
        }

        async function handleRazorpayPayment(addressData, total) {
            const btn = document.getElementById('main-place-btn');
            btn.disabled = true;
            btn.innerText = 'Initializing...';
            try {
                const keyRes = await fetch('/api/razorpay/key');
                const { key } = await keyRes.json();
                const res = await fetch('/api/razorpay/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: total })
                });
                const rzpOrder = await res.json();
                const options = {
                    "key": key,
                    "amount": rzpOrder.amount,
                    "currency": "INR",
                    "name": "Devangi Products",
                    "order_id": rzpOrder.id,
                    "handler": async function (response) {
                        const verifyRes = await fetch('/api/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(response)
                        });
                        if (verifyRes.ok) placeOrder(addressData, total, 'Razorpay', response.razorpay_payment_id);
                        else { alert("Payment failed verification."); btn.disabled = false; }
                    },
                    "prefill": { "name": addressData.first_name + " " + addressData.last_name, "email": currentUser ? currentUser.email : "", "contact": addressData.phone },
                    "theme": { "color": "#ec4899" }
                };
                new Razorpay(options).open();
            } catch (err) { alert("Payment error."); btn.disabled = false; }
        }

        async function placeOrder(addr, total, method, txnId = null) {
            const btn = document.getElementById('main-place-btn');
            btn.innerText = 'Finalizing...';
            const fullAddr = `${addr.house_no}, ${addr.society}, ${addr.street}, ${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}, ${addr.pincode}`;
            
            const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const actualShipping = subtotal >= shippingFreeAbove ? 0 : shippingCharge;
            
            const orderData = {
                user_id: currentUser ? currentUser.id : null,
                first_name: addr.first_name,
                last_name: addr.last_name,
                fullname: addr.fullname || `${addr.first_name} ${addr.last_name}`,
                phone: addr.phone,
                email: currentUser ? currentUser.email : "",
                total_amount: total,
                delivery_charge: actualShipping,
                address: fullAddr,
                house_no: addr.house_no,
                society: addr.society,
                street: addr.street,
                landmark: addr.landmark,
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
                label: addr.label || addr.nickname,
                items: cartItems.map(item => ({ id: item.id, name: item.title || item.name, price: item.price, quantity: item.quantity, image: item.image })),
                payment_method: method,
                transaction_id: txnId,
                payment_status: method === 'COD' ? 'Pending' : 'Paid'
            };
            try {
                const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
                if (res.ok) {
                    const resData = await res.json();
                    const orderId = resData.orderId;

                    // Track coupon usage
                    if (appliedCoupon && appliedCoupon.coupon_id) {
                        fetch(`/api/coupons/use/${appliedCoupon.coupon_id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: currentUser ? currentUser.id : null })
                        });
                    }
                    if (isBuyNow) {
                        sessionStorage.removeItem('buy_now_cart');
                    } else {
                        localStorage.removeItem('anon_cart');
                    }

                    // Customize Success Modal dynamically
                    if (!currentUser) {
                        const phone = orderData.phone;
                        const trackingUrl = `/track-order.html?phone=${phone}&order_id=${orderId}`;
                        document.getElementById('success-msg').innerHTML = `Your order has been placed successfully.<br><br><span class="font-bold text-lg text-pink-600">Order ID: #${orderId}</span><br><span class="text-xs text-gray-400">Please note down this ID or take a screenshot to track your order.</span>`;
                        document.getElementById('success-modal-actions').innerHTML = `
                            <a href="${trackingUrl}" class="block w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition">Track Order Status</a>
                            <a href="/index.html" class="block w-full text-gray-500 py-2 text-sm font-medium hover:underline">Back to Home</a>
                        `;
                        sessionStorage.removeItem('guest_checkout');
                    } else {
                        document.getElementById('success-msg').innerHTML = `Your order has been placed successfully.`;
                        document.getElementById('success-modal-actions').innerHTML = `
                            <a href="/account.html" class="block w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition">View My Orders</a>
                            <a href="/index.html" class="block w-full text-gray-500 py-2 text-sm font-medium hover:underline">Back to Home</a>
                        `;
                    }

                    document.getElementById('successModal').classList.remove('hidden');
                }
                else alert("Order failed.");
            } catch (err) { alert("Network error."); }
            finally { btn.disabled = false; }
        }

        // ===== Coupon Functions =====
        async function applyCoupon() {
            const code = document.getElementById('coupon-code-input').value.trim();
            const errEl = document.getElementById('coupon-error-msg');
            errEl.classList.add('hidden');
            if (!code) { errEl.textContent = 'Please enter a coupon code'; errEl.classList.remove('hidden'); return; }

            const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            try {
                const res = await fetch('/api/coupons/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, order_total: subtotal, user_id: currentUser ? currentUser.id : null, items: cartItems })
                });
                const data = await res.json();
                if (res.ok && data.valid) {
                    appliedCoupon = data;
                    document.getElementById('coupon-input-row').classList.add('hidden');
                    document.getElementById('coupon-success-row').classList.remove('hidden');
                    document.getElementById('coupon-success-msg').textContent = data.message;
                    renderOrderSummary();
                } else {
                    errEl.textContent = data.error || 'Invalid coupon';
                    errEl.classList.remove('hidden');
                }
            } catch (err) { errEl.textContent = 'Error validating coupon'; errEl.classList.remove('hidden'); }
        }

        function removeCoupon() {
            appliedCoupon = null;
            document.getElementById('coupon-input-row').classList.remove('hidden');
            document.getElementById('coupon-success-row').classList.add('hidden');
            document.getElementById('coupon-code-input').value = '';
            renderOrderSummary();
        }

        async function loadShippingSettings() {
            try {
                const res = await fetch('/api/settings');
                const settings = await res.json();
                chargeGujarat = parseFloat(settings.shipping_charge_gujarat) || 50;
                chargeMaharashtra = parseFloat(settings.shipping_charge_maharashtra) || 60;
                chargeOthers = parseFloat(settings.shipping_charge_others) || 100;
                shippingFreeAbove = parseFloat(settings.shipping_free_above) || 250;
                
                // Payment settings toggle
                const codEnabled = settings.payment_enable_cod !== '0';
                const onlineEnabled = settings.payment_enable_online !== '0';
                const whatsappEnabled = settings.payment_enable_whatsapp === '1';
                
                // Store WhatsApp order number for later use
                whatsappOrderNumber = settings.payment_whatsapp_number || settings.whatsapp_number || '';
                
                const payCodEl = document.getElementById('pay-cod');
                const payOnlineEl = document.getElementById('pay-online');
                const payWhatsappEl = document.getElementById('pay-whatsapp');
                
                if (payCodEl && payOnlineEl && payWhatsappEl) {
                    // Show/hide based on enabled status
                    if (!codEnabled) {
                        payCodEl.style.display = 'none';
                    } else {
                        payCodEl.style.display = 'flex';
                    }
                    
                    if (!onlineEnabled) {
                        payOnlineEl.style.display = 'none';
                    } else {
                        payOnlineEl.style.display = 'flex';
                    }
                    
                    if (whatsappEnabled) {
                        payWhatsappEl.style.display = 'flex';
                    } else {
                        payWhatsappEl.style.display = 'none';
                    }

                    // Remove any previous no-payment message
                    const existingMsg = document.getElementById('no-payment-methods-msg');
                    if (existingMsg) existingMsg.remove();
                    
                    // Auto selection logic — pick first available method
                    const anyEnabled = codEnabled || onlineEnabled || whatsappEnabled;
                    if (!anyEnabled) {
                        // No payment methods — show warning
                        let msgEl = document.createElement('p');
                        msgEl.id = 'no-payment-methods-msg';
                        msgEl.className = 'text-sm text-gray-500 font-medium text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200';
                        msgEl.textContent = 'Checkout is temporarily disabled. No payment methods are available.';
                        payCodEl.parentNode.appendChild(msgEl);
                        
                        const btn = document.getElementById('main-place-btn');
                        if (btn) {
                            btn.disabled = true;
                            btn.innerText = 'Checkout Disabled';
                        }
                    } else {
                        // Re-enable button in case it was previously disabled
                        const btn = document.getElementById('main-place-btn');
                        if (btn) btn.disabled = false;
                        
                        // Select first available payment method
                        if (codEnabled) selectPaymentMethod('COD');
                        else if (onlineEnabled) selectPaymentMethod('ONLINE');
                        else if (whatsappEnabled) selectPaymentMethod('WHATSAPP');
                    }
                }
                
                renderOrderSummary();
            } catch (err) { /* use defaults */ }
        }
    