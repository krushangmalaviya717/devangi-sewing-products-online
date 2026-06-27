document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        document.getElementById('pdp-title').innerText = "Product Not Found";
        return;
    }

    // Hide native number spinner arrows via inline style injection
    const style = document.createElement('style');
    style.textContent = `
        #pdp-qty::-webkit-inner-spin-button,
        #pdp-qty::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        #pdp-qty { -moz-appearance: textfield; }
    `;
    document.head.appendChild(style);

    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');

        const product = await res.json();

        // ---- Title ----
        document.getElementById('pdp-title').innerText = product.title;
        document.title = product.title + ' - Devangi Products';

        // ---- Price ----
        document.getElementById('pdp-price').innerText = `Rs. ${parseFloat(product.price).toFixed(2)}`;

        if (product.original_price) {
            const oldEl = document.getElementById('pdp-old-price');
            const discEl = document.getElementById('pdp-discount');
            oldEl.style.display = 'block';
            oldEl.innerText = `Rs. ${parseFloat(product.original_price).toFixed(2)}`;

            const discPct = Math.round((1 - product.price / product.original_price) * 100);
            if (discPct > 0) {
                discEl.style.display = 'inline';
                discEl.innerText = `-${discPct}% OFF`;
            }
        }

        // ---- Badge ----
        if (product.badge) {
            const badgeEl = document.getElementById('pdp-badge');
            badgeEl.textContent = product.badge;
            badgeEl.style.display = 'block';
        }

        // ---- Description ----
        if (product.description) {
            document.getElementById('pdp-description').innerText = product.description;
            document.getElementById('pdp-desc-wrap').style.display = 'block';
        }

        // ---- Sizes ----
        const sizesArr = Array.isArray(product.sizes) ? product.sizes.filter(s => s.trim() !== '') : [];
        const sizesSelect = document.getElementById('pdp-sizes');
        const sizeWrap = document.getElementById('pdp-size-wrap');
        sizesSelect.innerHTML = '';

        if (sizesArr.length > 0) {
            // Show the sizes the admin entered
            sizesArr.forEach(size => {
                const opt = document.createElement('option');
                opt.value = size;
                opt.textContent = size;
                sizesSelect.appendChild(opt);
            });
            sizeWrap.style.display = 'block';
            // Update label on change
            sizesSelect.addEventListener('change', () => {
                document.getElementById('pdp-size-label').textContent = sizesSelect.value;
            });
            document.getElementById('pdp-size-label').textContent = sizesArr[0];
        } else {
            // No sizes entered — hide the size section
            sizeWrap.style.display = 'none';
        }

        // ---- Offer Text ----
        if (product.offer_text) {
            document.getElementById('pdp-offer').innerText = '🏷️ ' + product.offer_text;
            document.getElementById('pdp-offer-wrap').style.display = 'block';
        }

        // ---- Stock Status ----
        const stockWrap = document.getElementById('pdp-stock-wrap');
        const stockBadge = document.getElementById('pdp-stock-badge');
        if (stockWrap && stockBadge) {
            stockWrap.style.display = 'block';
            if (product.stock === -1 || product.stock === null || product.stock === undefined) {
                stockBadge.innerHTML = '✅ In Stock';
                stockBadge.style.background = '#dcfce7';
                stockBadge.style.color = '#166534';
            } else if (product.stock === 0) {
                stockBadge.innerHTML = '❌ Out of Stock';
                stockBadge.style.background = '#fee2e2';
                stockBadge.style.color = '#991b1b';
                // Disable add to cart
                const addBtn = document.getElementById('pdp-add-cart');
                const buyBtn = document.getElementById('pdp-buy-now');
                if (addBtn) { addBtn.disabled = true; addBtn.style.opacity = '0.4'; addBtn.style.cursor = 'not-allowed'; addBtn.textContent = 'Out of Stock'; }
                if (buyBtn) { buyBtn.disabled = true; buyBtn.style.opacity = '0.4'; buyBtn.style.cursor = 'not-allowed'; }
            } else if (product.stock <= 5) {
                stockBadge.innerHTML = `⚠️ Only ${product.stock} left - Hurry!`;
                stockBadge.style.background = '#fef3c7';
                stockBadge.style.color = '#92400e';
            } else {
                stockBadge.innerHTML = `✅ In Stock (${product.stock} available)`;
                stockBadge.style.background = '#dcfce7';
                stockBadge.style.color = '#166534';
            }
        }

        // ---- Rating ----
        let ratingText = `Excellent ${parseFloat(product.rating || 4.9).toFixed(1)}/5`;
        try {
            const settingsRes = await fetch('/api/settings');
            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                
                // Rating text
                if (settings.pdp_rating_text) {
                    ratingText = settings.pdp_rating_text.replace('{rating}', parseFloat(product.rating || 4.9).toFixed(1));
                }

                // Delivery text
                if (settings.pdp_delivery_text) {
                    const dt = document.getElementById('pdp-delivery-text');
                    if (dt) dt.innerHTML = settings.pdp_delivery_text;
                }

                // Delivery Info text & toggle
                if (settings.pdp_delivery_info) {
                    const infoToggle = document.getElementById('pdp-delivery-info-toggle');
                    const infoContent = document.getElementById('pdp-delivery-info-content');
                    const infoIcon = document.getElementById('pdp-delivery-info-icon');
                    if (infoToggle && infoContent && infoIcon) {
                        infoContent.innerHTML = settings.pdp_delivery_info;
                        infoToggle.addEventListener('click', () => {
                            if (infoContent.style.display === 'none') {
                                infoContent.style.display = 'block';
                                infoIcon.setAttribute('name', 'chevron-up-outline');
                            } else {
                                infoContent.style.display = 'none';
                                infoIcon.setAttribute('name', 'chevron-down-outline');
                            }
                        });
                    }
                }
            }
        } catch(e) { console.error('Failed to load settings', e); }

        document.getElementById('pdp-rating-text').innerText = ratingText;
        const rating = parseFloat(product.rating) || 4.9;
        const starsEl = document.getElementById('pdp-stars');
        starsEl.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const icon = document.createElement('ion-icon');
            if (rating >= i) {
                icon.setAttribute('name', 'star');
            } else if (rating >= i - 0.5) {
                icon.setAttribute('name', 'star-half');
            } else {
                icon.setAttribute('name', 'star-outline');
            }
            starsEl.appendChild(icon);
        }

        // ---- Images Slider (up to 10) ----
        const images = Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : [product.image];

        const slider = document.getElementById('pdp-slider');
        const dotsContainer = document.getElementById('pdp-dots');
        const thumbsContainer = document.getElementById('pdp-thumbnails');
        
        slider.innerHTML = '';
        dotsContainer.innerHTML = '';
        thumbsContainer.innerHTML = '';

        images.forEach((imgSrc, idx) => {
            // 1. Add to Slider
            const slide = document.createElement('div');
            slide.className = 'pdp-slide';
            slide.innerHTML = `<img src="${imgSrc}" alt="${product.title} - ${idx + 1}" style="cursor: zoom-in;">`;
            slide.querySelector('img').addEventListener('click', () => openLightbox(imgSrc, images));
            slider.appendChild(slide);

            // 2. Add Dot
            const dot = document.createElement('div');
            dot.className = `pdp-dot ${idx === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                slider.scrollTo({
                    left: slider.offsetWidth * idx,
                    behavior: 'smooth'
                });
            });
            dotsContainer.appendChild(dot);

            // 3. Add Thumbnail
            const thumb = document.createElement('img');
            thumb.src = imgSrc;
            thumb.alt = `View ${idx + 1}`;
            thumb.style.cssText = `
                width: 100%; aspect-ratio: 1; object-fit: cover;
                border-radius: 8px; cursor: pointer; background-color: #f7f7f7;
                border: ${idx === 0 ? '2px solid var(--onyx)' : '1px solid var(--cultured)'};
                transition: border 0.2s;
            `;
            thumb.addEventListener('click', () => {
                slider.scrollTo({
                    left: slider.offsetWidth * idx,
                    behavior: 'smooth'
                });
            });
            thumbsContainer.appendChild(thumb);
        });

        // Sync Dots and Thumbnails on Scroll
        slider.addEventListener('scroll', () => {
            const index = Math.round(slider.scrollLeft / slider.offsetWidth);
            
            // Update dots
            dotsContainer.querySelectorAll('.pdp-dot').forEach((d, i) => {
                d.classList.toggle('active', i === index);
            });

            // Update thumbnails
            thumbsContainer.querySelectorAll('img').forEach((t, i) => {
                t.style.border = (i === index ? '2px solid var(--onyx)' : '1px solid var(--cultured)');
            });
        });

        // ---- Magnifier: open lightbox for current visible image ----
        const magnifierBtn = document.getElementById('pdp-magnifier');
        if (magnifierBtn) {
            magnifierBtn.addEventListener('click', () => {
                const index = Math.round(slider.scrollLeft / slider.offsetWidth);
                openLightbox(images[index], images);
            });
        }

        // ---- Quantity controls ----
        const qtyInput = document.getElementById('pdp-qty');
        document.getElementById('qty-minus').addEventListener('click', () => {
            const v = parseInt(qtyInput.value);
            if (v > 1) qtyInput.value = v - 1;
        });
        document.getElementById('qty-plus').addEventListener('click', () => {
            qtyInput.value = parseInt(qtyInput.value) + 1;
        });

        // ---- Add to Cart ----
        document.getElementById('pdp-add-cart').addEventListener('click', () => {
            const qty = parseInt(qtyInput.value) || 1;
            const selectedSize = sizesArr.length > 0 ? sizesSelect.value : 'All Size';

            const productData = {
                id: product.id,
                title: product.title + (selectedSize !== 'All Size' ? ` (${selectedSize})` : ''),
                price: parseFloat(product.price),
                image: images[0],
                quantity: qty
            };

            // Use global addToCart from cart.js, or manually push
            if (typeof addToCart === 'function') {
                const productId = String(product.id);
                const existing = cart.find(item => String(item.id) === productId && item.title === productData.title);
                if (existing) {
                    existing.quantity += qty;
                } else {
                    cart.push({...productData, id: productId});
                }
                saveCart();
                window.location.href = '/cart.html';
            }
        });

        // ---- Buy It Now ----
        const buyNowBtn = document.getElementById('pdp-buy-now');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                const selectedSize = sizesArr.length > 0 ? sizesSelect.value : 'All Size';

                // Buy Now: send ONLY this single product to checkout via sessionStorage
                // This does NOT touch the cart (anon_cart)
                const buyNowItem = [{
                    id: String(product.id),
                    title: product.title + (selectedSize !== 'All Size' ? ` (${selectedSize})` : ''),
                    price: parseFloat(product.price),
                    image: images[0],
                    quantity: qty
                }];
                sessionStorage.setItem('buy_now_cart', JSON.stringify(buyNowItem));
                window.location.href = '/checkout.html?buynow=1';
            });
        }

        // Call Related Products
        loadRelatedProducts(product.category, product.id, product.related_products);

    } catch (error) {
        console.error('Error fetching product details:', error);
        document.getElementById('pdp-title').innerText = "Failed to load product details";
    }

    // --- RELATED PRODUCTS ---
    async function loadRelatedProducts(category, currentId, explicitRelatedIdsString) {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            
            let related = [];
            if (explicitRelatedIdsString && explicitRelatedIdsString.trim() !== '') {
                const explicitIds = explicitRelatedIdsString.split(',').map(id => parseInt(id.trim())).filter(Boolean);
                related = products.filter(p => explicitIds.includes(p.id) && p.id !== currentId);
            }
            
            // Fallback to same category if no explicit related products found
            if (related.length === 0) {
                related = products.filter(p => p.category === category && p.id !== currentId).slice(0, 4);
            }
            
            const grid = document.getElementById('related-product-grid');
            if (related.length > 0) {
                grid.innerHTML = related.map(p => {
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

                    return `
                        <div class="np-card" onclick="location.href='/product.html?id=${p.id}'">
                            <div class="np-img-wrap">
                                <img src="${p.image}" class="np-img np-img-default" alt="${p.title}">
                                ${badgeHtml}
                            </div>
                            <div class="np-info">
                                <div class="np-cat">${p.category}</div>
                                <div class="np-title">${p.title}</div>
                                <div class="np-price-row">
                                    <span class="np-price">Rs. ${p.price}</span>
                                    ${p.original_price ? `<del class="np-del">Rs. ${p.original_price}</del>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                document.querySelector('.related-products').style.display = 'none';
            }
        } catch (err) {
            console.error('Related products error:', err);
        }
    }

    // --- REVIEWS LOGIC ---
    const reviewsContainer = document.getElementById('reviews-container');

    async function loadReviews() {
        try {
            const res = await fetch(`/api/reviews/${productId}`);
            const reviews = await res.json();
            
            const reviewsSection = document.querySelector('.reviews-section');
            if (reviews.length > 0) {
                if (reviewsSection) reviewsSection.style.display = 'block';
                reviewsContainer.innerHTML = reviews.map(r => `
                    <div class="review-item">
                        <div class="review-top">
                            <span class="review-user">${r.user_name}</span>
                            <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="review-rating">
                            ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}
                        </div>
                        <p class="review-comment">${r.comment || ''}</p>
                    </div>
                `).join('');
            } else {
                if (reviewsSection) reviewsSection.style.display = 'none';
            }
        } catch (err) {
            console.error('Reviews load error:', err);
        }
    }

    // Initial load
    loadReviews();

});

// ---- Cart toast ----
function showCartToast(title, qty) {
    const existing = document.getElementById('pdp-cart-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pdp-cart-toast';
    toast.innerHTML = `
        <span style="font-size:1.2rem;">🛒</span>
        <span><b>${qty}x ${title}</b> added to cart!</span>
        <a href="/cart.html" style="color:#f9a8d4; font-weight:bold; text-decoration:underline; white-space:nowrap;">View Cart</a>
    `;
    toast.style.cssText = `
        position: fixed; bottom: 28px; right: 24px; z-index: 9999;
        background: #1f2937; color: white;
        padding: 14px 20px; border-radius: 12px;
        font-size: 0.9rem; font-family: Poppins, sans-serif;
        box-shadow: 0 6px 24px rgba(0,0,0,0.25);
        display: flex; align-items: center; gap: 12px;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ---- Lightbox ----
function openLightbox(currentSrc, allImages) {
    const existing = document.getElementById('pdp-lightbox');
    if (existing) existing.remove();

    let currentIdx = allImages.indexOf(currentSrc);
    if (currentIdx < 0) currentIdx = 0;

    const overlay = document.createElement('div');
    overlay.id = 'pdp-lightbox';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.92);
        z-index: 99999; display: flex; align-items: center; justify-content: center;
        flex-direction: column; gap: 16px;
        animation: fadeIn 0.2s ease;
    `;

    const img = document.createElement('img');
    img.src = allImages[currentIdx];
    img.style.cssText = `max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 10px;`;

    // Counter
    const counter = document.createElement('div');
    counter.style.cssText = `color: white; font-size: 0.9rem; font-family: Poppins, sans-serif; opacity: 0.7;`;
    counter.textContent = `${currentIdx + 1} / ${allImages.length}`;

    // Thumbnails strip
    const strip = document.createElement('div');
    strip.style.cssText = `display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;`;
    allImages.forEach((src, i) => {
        const t = document.createElement('img');
        t.src = src;
        t.style.cssText = `width: 50px; height: 50px; object-fit: cover; border-radius: 6px; cursor: pointer; border: ${i === currentIdx ? '2px solid #ec4899' : '2px solid transparent'}; opacity: ${i === currentIdx ? 1 : 0.6}; transition: all 0.2s;`;
        t.addEventListener('click', () => {
            currentIdx = i;
            img.src = src;
            counter.textContent = `${currentIdx + 1} / ${allImages.length}`;
            strip.querySelectorAll('img').forEach((el, idx) => {
                el.style.border = idx === currentIdx ? '2px solid #ec4899' : '2px solid transparent';
                el.style.opacity = idx === currentIdx ? 1 : 0.6;
            });
        });
        strip.appendChild(t);
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `position: absolute; top: 20px; right: 24px; background: none; border: none; color: white; font-size: 1.8rem; cursor: pointer; line-height: 1;`;
    closeBtn.addEventListener('click', () => overlay.remove());

    // Prev/Next buttons (only if more than 1 image)
    if (allImages.length > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '&#8249;';
        prevBtn.style.cssText = `position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; font-size: 2.5rem; cursor: pointer; border-radius: 50%; width: 50px; height: 50px; line-height: 1;`;
        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); currentIdx = (currentIdx - 1 + allImages.length) % allImages.length; img.src = allImages[currentIdx]; counter.textContent = `${currentIdx+1}/${allImages.length}`; });

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '&#8250;';
        nextBtn.style.cssText = `position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; font-size: 2.5rem; cursor: pointer; border-radius: 50%; width: 50px; height: 50px; line-height: 1;`;
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); currentIdx = (currentIdx + 1) % allImages.length; img.src = allImages[currentIdx]; counter.textContent = `${currentIdx+1}/${allImages.length}`; });

        overlay.appendChild(prevBtn);
        overlay.appendChild(nextBtn);
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.appendChild(closeBtn);
    overlay.appendChild(img);
    overlay.appendChild(counter);
    if (allImages.length > 1) overlay.appendChild(strip);

    document.body.appendChild(overlay);
}
