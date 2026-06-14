async function loadDynamicNav() {
    try {
        const res = await fetch('/api/nav');
        const navItems = await res.json();
        
        const desktopNav = document.getElementById('dynamic-desktop-nav');
        const mobileNav = document.getElementById('dynamic-mobile-nav');
        
        let navHtml = '';
        navItems.forEach(item => {
            navHtml += `
                <li class="menu-category">
                    <a href="${item.url}" class="menu-title">${item.title}</a>
                </li>
            `;
        });
        
        if (desktopNav) desktopNav.innerHTML = navHtml;
        if (mobileNav) mobileNav.innerHTML = navHtml;

    } catch (error) {
        console.error('Error fetching navigation:', error);
    }
}

async function loadDynamicSettings() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        
        // 1. Hydrate footer contact info dynamically
        const footerAddress = document.querySelector('footer .footer-nav-item address.content');
        if (footerAddress && settings.store_address) {
            footerAddress.textContent = settings.store_address;
        }
        
        const footerPhone = document.querySelector('footer .footer-nav-item a[href^="tel:"]');
        if (footerPhone && settings.store_phone) {
            footerPhone.textContent = settings.store_phone;
            footerPhone.href = `tel:${settings.store_phone.replace(/[^0-9+]/g, '')}`;
        }
        
        const footerEmail = document.querySelector('footer .footer-nav-item a[href^="mailto:"]');
        if (footerEmail && settings.store_email) {
            footerEmail.textContent = settings.store_email;
            footerEmail.href = `mailto:${settings.store_email}`;
        }
        
        // 2. Toggle homepage custom sections visibility based on settings
        const badgesSection = document.getElementById('homepage-trust-badges');
        if (badgesSection && settings.homepage_show_trust_badges === '0') {
            badgesSection.style.display = 'none';
        }
        
        const testimonialsSection = document.getElementById('homepage-testimonials');
        if (testimonialsSection && settings.homepage_show_testimonials === '0') {
            testimonialsSection.style.display = 'none';
        }
        
        const faqsSection = document.getElementById('homepage-faqs');
        if (faqsSection && settings.homepage_show_faqs === '0') {
            faqsSection.style.display = 'none';
        }

        // 3. Hide COD FAQ item if COD is disabled in admin settings
        const faqCod = document.getElementById('faq-item-cod');
        if (faqCod) {
            faqCod.style.display = settings.payment_enable_cod === '0' ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Error loading store settings:', error);
    }
}

function initPage() {
    loadDynamicNav();
    loadDynamicSettings();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}
