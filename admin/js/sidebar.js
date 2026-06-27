// ===== Advanced Admin Sidebar Component =====
// Loaded on every admin page. Renders the sidebar dynamically.

(function () {
    const SIDEBAR_ID = 'admin-sidebar';

    // Sidebar menu structure
    const menuSections = [
        {
            label: 'Main Menu',
            items: [
                { href: 'index.html', icon: 'dashboard', label: 'Dashboard', permission: 'dashboard' },
                { href: 'orders.html', icon: 'orders', label: 'Orders', permission: 'orders', badge: true },
                { href: 'products.html', icon: 'products', label: 'Products', permission: 'products' },
                { href: 'categories.html', icon: 'categories', label: 'Categories', permission: 'categories' },
                { href: 'coupons.html', icon: 'coupons', label: 'Coupons', permission: 'coupons' },
                { href: 'users.html', icon: 'users', label: 'Users', permission: 'users' },
            ]
        },
        {
            label: 'Storefront',
            items: [
                { href: 'banners.html', icon: 'banners', label: 'Banners', permission: 'banners' },
                { href: 'reviews.html', icon: 'reviews', label: 'Reviews Moderation', permission: 'reviews' },
                { href: 'navigation.html', icon: 'navigation', label: 'Navigation', permission: 'navigation' },
                { href: 'contact.html', icon: 'contact', label: 'Contact', permission: 'contact' },
            ]
        },
        {
            label: 'Analytics',
            items: [
                { href: 'reports.html', icon: 'reports', label: 'Reports', permission: 'reports' },
                {
                    label: 'Settings',
                    icon: 'settings',
                    permission: 'settings',
                    id: 'menu-settings',
                    submenu: [
                        { href: 'settings.html?tab=general', label: 'General Store', tab: 'general', permission: 'settings' },
                        { href: 'settings.html?tab=shipping', label: 'Shipping & Tax', tab: 'shipping', permission: 'settings' },
                        { href: 'settings.html?tab=payments', label: 'Payment Gateways', tab: 'payments', permission: 'settings' },
                        { href: 'settings.html?tab=whatsapp', label: 'WhatsApp Alerts', tab: 'whatsapp', permission: 'settings' },
                        { href: 'settings.html?tab=seo', label: 'SEO & Socials', tab: 'seo', permission: 'settings' },
                        { href: 'staff.html', label: 'Staff & Roles', permission: 'staff' },
                    ]
                }
            ]
        }
    ];

    // SVG path content map
    const icons = {
        dashboard: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>`,
        orders: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>`,
        products: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>`,
        categories: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>`,
        coupons: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>`,
        users: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>`,
        banners: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>`,
        reviews: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>`,
        navigation: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>`,
        contact: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>`,
        reports: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>`,
        settings: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>`,
        staff: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>`
    };

    function makeIcon(name, isActive) {
        const iconSvg = icons[name] || icons.dashboard;
        const colorClass = isActive ? 'text-pink-500' : 'text-gray-400 group-hover:text-gray-500 transition-colors';
        return `<svg class="w-5 h-5 mr-3 shrink-0 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg>`;
    }

    function getCurrentPage() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        if (path === 'user_details.html') return 'users.html';
        return path;
    }

    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    function checkFrontendPermission(permissions, module, action = 'view') {
        if (!permissions || !Array.isArray(permissions)) return false;
        if (permissions.includes(module)) return true;
        if (module === 'staff' && permissions.includes('settings')) return true;
        if (module === 'settings' && permissions.includes('staff')) return true;
        if (permissions.includes(`${module}_${action}`)) return true;
        if (action === 'view') {
            return permissions.some(p => p.startsWith(module + '_'));
        }
        return false;
    }

    // Toggle submenu function
    window.toggleSubmenu = function(menuId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (menuId === 'menu-settings') {
            window.sidebarSettingsExpanded = !window.sidebarSettingsExpanded;
            renderSidebar();
        }
    };

    function renderSidebar() {
        const sidebar = document.getElementById(SIDEBAR_ID);
        if (!sidebar) return;

        const currentPage = getCurrentPage();
        const currentTab = getQueryParam('tab');

        // Check if Settings dropdown should be open by default
        const isSettingsPageActive = currentPage === 'settings.html' || currentPage === 'staff.html';
        if (window.sidebarSettingsExpanded === undefined) {
            window.sidebarSettingsExpanded = isSettingsPageActive;
        }

        // Match original container styling and add flex-shrink-0 to prevent squashing
        sidebar.className = 'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform -translate-x-full md:translate-x-0 md:static md:inset-auto transition-transform duration-300 ease-in-out flex flex-col shadow-sm md:shadow-none shrink-0';

        let html = `
        <div class="h-16 flex items-center px-6 border-b border-gray-100 justify-between shrink-0">
            <div class="flex items-center gap-2">
                <img src="/assets/images/logo/logo.svg" alt="Devangi Products" class="h-7" id="sidebar-logo-img">
            </div>
            <button onclick="toggleMobileMenu()" class="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        
        <div class="flex-1 overflow-y-auto py-5 px-4 space-y-1">`;

        menuSections.forEach((section, sIdx) => {
            if (sIdx > 0) {
                html += `<div class="pt-4 mt-4 border-t border-gray-100">`;
            } else {
                html += `<div>`;
            }
            html += `<p class="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">${section.label}</p>`;

            section.items.forEach(item => {
                if (item.submenu) {
                    const isParentActive = isSettingsPageActive;
                    const isExpanded = window.sidebarSettingsExpanded;
                    
                    html += `
                    <div class="space-y-1" data-permission="${item.permission}">
                        <button onclick="toggleSubmenu('${item.id}', event)" class="flex items-center w-full px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group text-left text-sm cursor-pointer select-none">
                            ${makeIcon(item.icon, isParentActive)}
                            <span class="flex-1">${item.label}</span>
                            <svg class="w-4 h-4 ml-auto text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div class="${isExpanded ? 'block' : 'hidden'} pl-8 pr-2 mt-1 space-y-1">`;
                        
                    item.submenu.forEach(sub => {
                        let isSubActive = false;
                        if (sub.href.startsWith('settings.html')) {
                            isSubActive = currentPage === 'settings.html' && (currentTab === sub.tab || (!currentTab && sub.tab === 'general'));
                        } else {
                            isSubActive = currentPage === sub.href;
                        }
                        
                        html += `
                        <a href="${sub.href}" class="block py-2 px-3 text-xs rounded-lg transition-colors cursor-pointer ${isSubActive ? 'text-pink-600 bg-pink-50/50 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}" data-permission="${sub.permission}">
                            ${sub.label}
                        </a>`;
                    });
                    
                    html += `
                        </div>
                    </div>`;
                } else {
                    const isActive = currentPage === item.href;
                    const badgeHtml = item.badge ? `<span class="ml-auto bg-pink-100 text-pink-600 py-0.5 px-2 rounded-full text-[10px] font-bold" id="sidebar-order-badge">0</span>` : '';

                    if (isActive) {
                        html += `
                        <a href="${item.href}" class="flex items-center px-3 py-2.5 bg-pink-50 text-pink-600 rounded-lg font-medium group transition-colors text-sm" data-permission="${item.permission}">
                            ${makeIcon(item.icon, true)}
                            ${item.label}
                            ${badgeHtml}
                        </a>`;
                    } else {
                        html += `
                        <a href="${item.href}" class="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group text-sm" data-permission="${item.permission}">
                            ${makeIcon(item.icon, false)}
                            ${item.label}
                            ${badgeHtml}
                        </a>`;
                    }
                }
            });

            html += `</div>`;
        });

        html += `
        </div>
        
        <div class="p-4 border-t border-gray-100 bg-gray-50/50">
            <a href="/" target="_blank" class="flex items-center justify-center w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all font-medium text-sm shadow-sm group">
                <svg class="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                View Live Store
            </a>
        </div>`;

        sidebar.innerHTML = html;

        // Fetch dynamic logo from settings to match header
        fetch('/api/settings')
            .then(res => res.json())
            .then(settings => {
                if (settings.store_logo) {
                    const img = document.getElementById('sidebar-logo-img');
                    if (img) img.src = settings.store_logo;
                }
            }).catch(() => {});
    }

    // Fetch session permissions
    async function applyAdminSession() {
        try {
            const res = await fetch('/api/admin/session');
            if (!res.ok) return;
            const data = await res.json();
            if (data.loggedIn && data.admin) {
                if (data.isSuper) return; // Super admins see everything
                
                const permissions = data.admin.permissions || [];

                // Filter items based on permissions
                document.querySelectorAll('#admin-sidebar [data-permission]').forEach(el => {
                    const perm = el.getAttribute('data-permission');
                    if (perm && !checkFrontendPermission(permissions, perm, 'view')) {
                        el.style.setProperty('display', 'none', 'important');
                    }
                });
            }
        } catch (e) {
            console.error('Sidebar: session check failed', e);
        }
    }

    // Initialize
    function init() {
        renderSidebar();
        applyAdminSession();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
