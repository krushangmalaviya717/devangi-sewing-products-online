/**
 * home.js — Dynamic homepage loader
 * - Category tiles (top scrollable row) from /api/categories
 * - Sidebar categories (accordion style)
 * - Best Sellers sidebar (top 4 by rating — proxy for most ordered)
 * - New Arrivals (top 4 most recently added products)
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [productsRes, categoriesRes, bannersRes] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories'),
            fetch('/api/banners')
        ]);
        const products = await productsRes.json();
        let categories = await categoriesRes.json();
        const banners = await bannersRes.json();

        // Only show categories that have products
        categories = categories.filter(cat => (parseInt(cat.product_count) || 0) > 0);

        renderBanners(banners);
        renderCategoryTiles(categories);
        renderSidebarCategories(categories);
        renderBestSellers(products);
        renderNewArrivals(products);

        // Fetch and render latest reviews for testimonials
        try {
            const reviewsRes = await fetch('/api/public/reviews/latest');
            const reviews = await reviewsRes.json();
            renderTestimonials(reviews);
        } catch (e) {
            console.error('Error loading testimonials:', e);
        }

    } catch (err) {
        console.error('home.js error:', err);
    }
});

// ── Helper: star icons ────────────────────────────────────────────────────────
function starsHtml(rating) {
    let h = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i)            h += '<ion-icon name="star"></ion-icon>';
        else if (rating >= i - 0.5) h += '<ion-icon name="star-half-outline"></ion-icon>';
        else                        h += '<ion-icon name="star-outline"></ion-icon>';
    }
    return h;
}

// ── 0. Hero Banners ──────────────────────────────────────────────────────────
function renderBanners(banners) {
    const container = document.getElementById('home-banners');
    if (!container) return;

    if (!banners || banners.length === 0) {
        return;
    }

    container.innerHTML = '';
    banners.forEach(b => {
        // Only render active banners (status === 1)
        if (b.status !== 1) return;

        const item = document.createElement('div');
        item.className = 'slider-item';

        // Check if there is any overlay content to show
        const hasOverlay = (b.title && b.title.trim() !== '' && b.title.toLowerCase() !== 'none') || 
                            (b.subtitle && b.subtitle.trim() !== '' && b.subtitle.toLowerCase() !== 'none') || 
                            (b.offer_text && b.offer_text.trim() !== '' && b.offer_text.toLowerCase() !== 'none') || 
                            (b.button_text && b.button_text.trim() !== '' && b.button_text.toLowerCase() !== 'none');

        const targetAttr = b.open_new_tab === 1 ? 'target="_blank"' : '';
        const hrefAttr = b.link_url ? `href="${b.link_url}"` : '';

        // HTML picture element for responsive mobile image swap
        let imageHTML = '';
        if (b.mobile_image_url && b.mobile_image_url.trim() !== '') {
            imageHTML = `
                <picture class="banner-picture" style="width: 100%; display: block;">
                    <source media="(max-width: 768px)" srcset="${b.mobile_image_url}">
                    <img src="${b.image_url}" alt="${b.title || 'Banner'}" class="banner-img" style="width: 100%; height: auto; display: block; object-fit: contain;">
                </picture>
            `;
        } else {
            imageHTML = `<img src="${b.image_url}" alt="${b.title || 'Banner'}" class="banner-img" style="width: 100%; height: auto; display: block; object-fit: contain;">`;
        }

        if (b.link_url) {
            item.innerHTML = `
                <a ${hrefAttr} ${targetAttr} class="banner-link-wrapper" style="display: block; width: 100%; height: 100%; position: relative; color: inherit; text-decoration: none;">
                    ${imageHTML}
                </a>
            `;
        } else {
            item.innerHTML = `
                ${imageHTML}
            `;
        }

        container.appendChild(item);
    });
}

// ── 1. Category tiles row ─────────────────────────────────────────────────────
function renderCategoryTiles(categories) {
    const container = document.getElementById('home-category-tiles');
    if (!container) return;
    container.innerHTML = '';

    categories.forEach(cat => {
        const item = document.createElement('div');
        item.style.flexShrink = '0';
        item.innerHTML = `
            <a href="/shop.html?category=${encodeURIComponent(cat.name)}" class="cat-tile">
                <div class="cat-tile-icon">
                    ${cat.icon && cat.icon.startsWith('/') ? `<img src="${cat.icon}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px; margin: 0 auto;">` : (cat.icon || '🏷️')}
                </div>
                <div class="cat-tile-info">
                    <h3 class="cat-tile-name">${cat.name}</h3>
                    <p class="cat-tile-count">${cat.product_count || 0} Products</p>
                </div>
                <div class="cat-tile-arrow">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </div>
            </a>`;
        container.appendChild(item);
    });
}

// ── 2. Sidebar categories (simple clickable links) ────────────────────────────
function renderSidebarCategories(categories) {
    const list = document.getElementById('home-sidebar-categories');
    if (!list) return;
    list.innerHTML = '';

    categories.forEach(cat => {
        const li = document.createElement('li');
        li.className = 'sidebar-menu-category';
        li.innerHTML = `
            <a href="/shop.html?category=${encodeURIComponent(cat.name)}" class="sidebar-category-link"
               style="display:flex; align-items:center; gap:10px; padding:10px 14px;
                      color:var(--eerie-black,#222); font-size:14px; font-weight:500;
                      border-radius:8px; transition:background 0.2s, color 0.2s;
                      text-decoration:none; width:100%; cursor:pointer;"
               onmouseover="this.style.background='#fef0f6';this.style.color='#e83e8c';"
               onmouseout="this.style.background='';this.style.color='';">
                <span style="font-size:1.1rem; display:flex; align-items:center; justify-content:center; width:24px; height:24px;">
                    ${cat.icon && cat.icon.startsWith('/') ? `<img src="${cat.icon}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">` : (cat.icon || '🏷️')}
                </span>
                <p style="flex:1; margin:0;">${cat.name}</p>
                <span style="font-size:12px; color:#aaa;">(${cat.product_count || 0})</span>
            </a>`;
        list.appendChild(li);
    });
}

// ── 3. Best Sellers (top 4 by rating) ─────────────────────────────────
function renderBestSellers(products) {
    const container = document.getElementById('home-best-sellers-col');
    if (!container || products.length === 0) return;

    const best = [...products]
        .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
        .slice(0, 4);

    fillShowcaseContainer(container, best);
}

// ── 4. New Arrivals (4 most recently added) ────────────────────────────────────
function renderNewArrivals(products) {
    const container = document.getElementById('home-new-arrivals-col');
    if (!container) return;

    // Products are already sorted by id DESC from API (newest first)
    const latest = products.slice(0, 4);

    fillShowcaseContainer(container, latest);
}

function fillShowcaseContainer(container, items) {
    if (!container) return;
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p style="font-size:.85rem;color:#bbb;padding:10px;">No products yet.</p>';
        return;
    }

    items.forEach(p => {
        const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image];
        const div = document.createElement('div');
        div.className = 'showcase';
        div.innerHTML = `
            <a href="/product.html?id=${p.id}" class="showcase-img-box">
                <img src="${images[0]}" alt="${p.title}" width="70" class="showcase-img"
                     style="object-fit:cover; height:70px; border-radius:6px;">
            </a>
            <div class="showcase-content">
                <a href="/product.html?id=${p.id}">
                    <h4 class="showcase-title">${p.title}</h4>
                </a>
                <a href="/shop.html?category=${encodeURIComponent(p.category)}" class="showcase-category">${p.category}</a>
                <div class="price-box">
                    <p class="price">Rs. ${parseFloat(p.price).toFixed(0)}</p>
                    ${p.original_price ? `<del>Rs. ${parseFloat(p.original_price).toFixed(0)}</del>` : ''}
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function renderTestimonials(reviews) {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
        // Keep the default ones if no reviews in DB yet
        return;
    }

    container.innerHTML = '';
    reviews.forEach(r => {
        const div = document.createElement('div');
        div.className = 'testimonial-card';
        div.style.cssText = 'background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); flex: 1; min-width: 300px; max-width: 360px; display: flex; flex-direction: column; justify-content: space-between;';
        
        const stars = '⭐'.repeat(r.rating);
        
        div.innerHTML = `
            <div>
                <div style="color: #ffb800; font-size: 18px; margin-bottom: 10px;">${stars}</div>
                <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px;">"${r.comment}"</p>
            </div>
            <div>
                <h4 style="font-size: 14px; font-weight: 600; color: #333;">- ${r.user_name}</h4>
                <p style="font-size: 11px; color: #aaa; margin-top: 5px;">Reviewed on: <a href="/product.html?id=${r.product_id}" style="color: var(--salmon-pink); font-weight: 500; text-decoration: underline;">${r.product_title || 'Product'}</a></p>
            </div>
        `;
        container.appendChild(div);
    });
}
