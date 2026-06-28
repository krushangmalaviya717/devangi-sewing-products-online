document.addEventListener('DOMContentLoaded', () => {
    fetchMainProducts();
});

async function fetchMainProducts() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const products = await res.json();

        const grid = document.querySelector('.product-main .product-grid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = `<p style="padding:40px;color:#999;text-align:center;grid-column:1/-1;">No products added yet. Add products from the Admin panel.</p>`;
            return;
        }

        grid.innerHTML = '';
        products.forEach(p => {
            const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image];
            const img1 = images[0] || p.image;
            const img2 = images[1] || img1;

            // Badge label
            let badgeHtml = '';
            const hasDiscount = p.original_price && parseFloat(p.original_price) > parseFloat(p.price);

            if (p.badge && p.badge !== 'None') {
                const badgeColors = {
                    'Sale':       'background:linear-gradient(135deg, #ff007f 0%, #ff4500 100%);color:#fff',
                    'Hot':        'background:linear-gradient(135deg, #ff4500 0%, #ff8c00 100%);color:#fff',
                    'New':        'background:linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);color:#fff',
                    'Trending':   'background:linear-gradient(135deg, #00b894 0%, #55efc4 100%);color:#fff',
                    'Best Seller':'background:linear-gradient(135deg, #fdcb6e 0%, #f39c12 100%);color:#333',
                    'Limited':    'background:linear-gradient(135deg, #d63031 0%, #ff7675 100%);color:#fff',
                };
                const style = badgeColors[p.badge] || 'background:#444;color:#fff';
                badgeHtml = `<span class="np-badge" style="${style}">${p.badge}</span>`;
            } else if (hasDiscount) {
                const discountPct = Math.round((1 - parseFloat(p.price) / parseFloat(p.original_price)) * 100);
                if (discountPct > 0) {
                    badgeHtml = `<span class="np-badge" style="background:linear-gradient(135deg, #e83e8c 0%, #ff7675 100%);color:#fff">-${discountPct}% OFF</span>`;
                }
            }

            // Stars
            const rating = parseFloat(p.rating) || 4.5;
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (rating >= i)            starsHtml += '<ion-icon name="star"></ion-icon>';
                else if (rating >= i - 0.5) starsHtml += '<ion-icon name="star-half-outline"></ion-icon>';
                else                        starsHtml += '<ion-icon name="star-outline"></ion-icon>';
            }

            const card = document.createElement('div');
            card.className = 'np-card';
            // Out of stock overlay
            const isOutOfStock = p.stock === 0;
            const stockBadgeHtml = isOutOfStock ? '<span class="np-badge" style="background:#ef4444;color:#fff;top:auto;bottom:12px;left:12px;">Out of Stock</span>' : '';

            card.innerHTML = `
                <div class="np-img-wrap" ${isOutOfStock ? 'style="opacity:0.6"' : ''}>
                    <a href="/product.html?id=${p.id}">
                        <img src="${img1}" alt="${p.title}" class="np-img np-img-default">
                    </a>
                    ${badgeHtml}
                    ${stockBadgeHtml}
                    <div class="np-actions">
                        <button class="np-action-btn" title="Quick View" onclick="window.location.href='/product.html?id=${p.id}'"><ion-icon name="eye-outline"></ion-icon></button>
                    </div>
                </div>
                <div class="np-info">
                    <a href="/shop.html?category=${encodeURIComponent(p.category)}" class="np-cat">${p.category}</a>
                    <a href="/product.html?id=${p.id}" class="np-title">${p.title}</a>
                    <div class="np-stars">${starsHtml}</div>
                    <div class="np-price-row">
                        <span class="np-price">Rs. ${parseFloat(p.price).toFixed(0)}</span>
                        ${p.original_price ? `<del class="np-del">Rs. ${parseFloat(p.original_price).toFixed(0)}</del>` : ''}
                    </div>
                    <button class="np-add-btn add-to-cart-btn${isOutOfStock ? ' disabled' : ''}"
                         data-id="${p.id}"
                         data-title="${p.title}"
                         data-price="${p.price}"
                         data-image="${img1}"
                         ${isOutOfStock ? 'disabled style="opacity:0.4;cursor:not-allowed;background:#999"' : ''}>
                        <ion-icon name="${isOutOfStock ? 'close-circle-outline' : 'bag-add-outline'}"></ion-icon> ${isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
                    </button>
                </div>
            `;
            
            // Make the entire card clickable (excluding specific buttons/links)
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('.np-add-btn') || e.target.closest('.np-cat') || e.target.closest('.np-actions')) {
                    return;
                }
                window.location.href = `/product.html?id=${p.id}`;
            });

            grid.appendChild(card);
        });

        // Re-attach cart listeners for new buttons
        if (typeof initCartButtons === 'function') initCartButtons();

    } catch (error) {
        console.error('Error loading dynamic products:', error);
    }
}
