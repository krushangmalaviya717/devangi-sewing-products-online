document.addEventListener('DOMContentLoaded', async () => {
    // Elements to hydrate
    const elLocation = document.getElementById('store_location_display');
    const elPhone = document.getElementById('store_phone_display');
    const elEmail = document.getElementById('store_email_display');
    
    const selOrderStatus = document.getElementById('contact_order_status');
    const selDelivery = document.getElementById('contact_delivery_related');
    
    // Fetch settings
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        
        // Hydrate store details
        if (settings.store_location && elLocation) {
            elLocation.innerHTML = settings.store_location.replace(/\n/g, '<br>');
        }
        if (settings.store_phone && elPhone) {
            elPhone.textContent = settings.store_phone;
            elPhone.href = `tel:${settings.store_phone.replace(/[^0-9+]/g, '')}`;
        }
        if (settings.store_email && elEmail) {
            elEmail.textContent = settings.store_email;
            elEmail.href = `mailto:${settings.store_email}`;
        }
        
        // Hydrate dropdowns
        if (settings.contact_form_options) {
            try {
                const opts = JSON.parse(settings.contact_form_options);
                
                if (opts.order_status && Array.isArray(opts.order_status) && selOrderStatus) {
                    // Keep the first disabled option
                    const firstOpt = selOrderStatus.firstElementChild;
                    selOrderStatus.innerHTML = '';
                    if (firstOpt) selOrderStatus.appendChild(firstOpt);
                    
                    opts.order_status.forEach(optText => {
                        const opt = document.createElement('option');
                        opt.value = optText;
                        opt.textContent = optText;
                        selOrderStatus.appendChild(opt);
                    });
                }
                
                if (opts.delivery_related && Array.isArray(opts.delivery_related) && selDelivery) {
                    // Keep the first disabled option
                    const firstOpt = selDelivery.firstElementChild;
                    selDelivery.innerHTML = '';
                    if (firstOpt) selDelivery.appendChild(firstOpt);
                    
                    opts.delivery_related.forEach(optText => {
                        const opt = document.createElement('option');
                        opt.value = optText;
                        opt.textContent = optText;
                        selDelivery.appendChild(opt);
                    });
                }
            } catch (err) {
                console.error("Error parsing contact form options", err);
            }
        }
    } catch (err) {
        console.error("Failed to fetch store settings", err);
    }
    
    // Handle Form Submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact_name').value;
            const email = document.getElementById('contact_email').value;
            const order_status = selOrderStatus ? selOrderStatus.value : '';
            const delivery_related = selDelivery ? selDelivery.value : '';
            const message = document.getElementById('contact_message').value;
            
            // Basic validation
            if (!name || !email || !message) {
                alert('Please fill in all required fields.');
                return;
            }
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            
            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, email, order_status, delivery_related, message
                    })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    alert('Thank you for contacting us! We will get back to you soon.');
                    contactForm.reset();
                } else {
                    alert('Error: ' + (data.error || 'Failed to send message'));
                }
            } catch (err) {
                console.error("Error submitting contact form", err);
                alert('An error occurred. Please try again later.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        });
    }
});
