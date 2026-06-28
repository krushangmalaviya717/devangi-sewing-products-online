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

        // 4. Handle social links visibility and URLs
        const socialEnabled = settings.social_enabled !== '0';
        const headerSocials = document.querySelectorAll('.header-social-container');
        const menuSocials = document.querySelectorAll('.menu-social-container');
        const footerSocials = document.querySelectorAll('ul.social-link');
        const footerLists = document.querySelectorAll('footer .footer-nav-list');

        if (!socialEnabled) {
            headerSocials.forEach(el => el.style.setProperty('display', 'none', 'important'));
            menuSocials.forEach(el => el.style.setProperty('display', 'none', 'important'));
            footerSocials.forEach(el => el.style.setProperty('display', 'none', 'important'));
            footerLists.forEach(list => {
                if (list.textContent.includes('Follow Us')) {
                    list.style.setProperty('display', 'none', 'important');
                }
            });
        } else {
            headerSocials.forEach(el => el.style.display = '');
            menuSocials.forEach(el => el.style.display = '');
            footerSocials.forEach(el => el.style.display = '');
            footerLists.forEach(list => {
                if (list.textContent.includes('Follow Us')) {
                    list.style.display = '';
                }
            });

            const urlMap = {
                'logo-facebook': settings.social_facebook,
                'logo-instagram': settings.social_instagram,
                'logo-youtube': settings.social_youtube
            };

            const updateSocialContainer = (container) => {
                const links = container.querySelectorAll('a');
                links.forEach(link => {
                    const icon = link.querySelector('ion-icon');
                    if (icon) {
                        const iconName = icon.getAttribute('name');
                        const targetUrl = urlMap[iconName];
                        if (targetUrl && targetUrl.trim() !== '') {
                            link.href = targetUrl;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            const parentLi = link.closest('li');
                            if (parentLi) parentLi.style.display = '';
                            link.style.display = '';
                        } else {
                            const parentLi = link.closest('li');
                            if (parentLi) {
                                parentLi.style.display = 'none';
                            } else {
                                link.style.display = 'none';
                            }
                        }
                    }
                });
            };

            headerSocials.forEach(updateSocialContainer);
            menuSocials.forEach(updateSocialContainer);
            footerSocials.forEach(updateSocialContainer);
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
