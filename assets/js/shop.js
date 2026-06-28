let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        allProducts = await res.json();
        
        initializeFilters();

        // Check for URL search parameter
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        
        if (searchQuery) {
            const filtered = allProducts.filter(p => 
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
            renderShopProducts(filtered);
        } else {
            renderShopProducts(allProducts);
        }
    } catch (error) {
        console.error('Error loading shop products:', error);
        document.getElementById('shop-product-grid').innerHTML = '<p>Failed to load products.</p>';
    }
});

function initializeFilters() {
    // 1. Get unique categories
    const categories = [...new Set(allProducts.map(p => p.category))];
    const categoryContainer = document.getElementById('category-filters');
    
    if (categoryContainer && categories.length > 0) {
        categoryContainer.innerHTML = '';
        
        // Check for URL category parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlCategory = urlParams.get('category');

        categories.forEach(cat => {
            const wrapper = document.createElement('label');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '8px';
            wrapper.style.cursor = 'pointer';
            
            const isChecked = urlCategory === cat ? 'checked' : '';
            
            wrapper.innerHTML = `
                <input type="checkbox" value="${cat}" class="category-checkbox" style="width: 16px; height: 16px; accent-color: var(--salmon-pink);" ${isChecked}>
                <span>${cat}</span>
            `;
            categoryContainer.appendChild(wrapper);
        });
        
        // Add event listeners to newly created checkboxes
        document.querySelectorAll('.category-checkbox').forEach(cb => {
            cb.addEventListener('change', applyFilters);
        });
        
        // If a category was in the URL, apply the filter immediately
        if (urlCategory) {
             setTimeout(applyFilters, 0); 
        }
    }

    // 2. Setup Price Slider
    const priceSlider = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-display');
    
    if (priceSlider && priceDisplay && allProducts.length > 0) {
        // Find max price dynamically
        const maxDbPrice = Math.max(...allProducts.map(p => parseFloat(p.price)));
        const roundedMax = Math.ceil(maxDbPrice / 10) * 10; // Round to nearest 10
        
        priceSlider.max = roundedMax;
        priceSlider.value = roundedMax;
        priceDisplay.innerText = `Rs. ${roundedMax}`;
        
        priceSlider.addEventListener('input', (e) => {
            priceDisplay.innerText = `Rs. ${e.target.value}`;
            applyFilters();
        });
    }
}

function applyFilters() {
    // Determine active categories
    const activeCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    const activeCategories = Array.from(activeCheckboxes).map(cb => cb.value);
    
    // Determine max price
    const maxPrice = parseFloat(document.getElementById('price-slider').value) || 9999;
    
    // Filter the internal array
    const filteredProducts = allProducts.filter(p => {
        // Price check
        if (parseFloat(p.price) > maxPrice) return false;
        
        // Category check (if none selected, show all)
        if (activeCategories.length > 0 && !activeCategories.includes(p.category)) {
            return false;
        }
        
        return true;
    });
    
    // Trigger render
    renderShopProducts(filteredProducts);
}

function renderShopProducts(products) {
    const grid = document.getElementById('shop-product-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="padding: 20px;">No products match your filters.</p>';
        return;
    }

    grid.innerHTML = '';
    products.forEach(p => {
        const isOutOfStock = p.stock === 0;

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

        const stockBadgeHtml = isOutOfStock ? '<span class="np-badge" style="background:#ef4444;color:#fff;top:auto;bottom:12px;left:12px;">Out of Stock</span>' : '';

        // Images
        const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image];
        const img1 = images[0] || p.image;
        const img2 = images[1] || img1;

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
        if (isOutOfStock) {
            card.style.opacity = '0.7';
        }

        card.innerHTML = `
            <div class="np-img-wrap">
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
                    ${isOutOfStock ? 'disabled' : ''}>
                    <ion-icon name="bag-add-outline"></ion-icon>
                    Add to Cart
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
}
