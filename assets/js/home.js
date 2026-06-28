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

// ===== Blog Post Modal Reader =====
const blogArticles = [
    {
        title: "10 Essential Sewing Tools Every Beginner Needs",
        category: "Sewing Guide",
        date: "Jun 20, 2026",
        image: "./assets/images/blog-1.png",
        content: `
            <p>Starting your sewing journey can be incredibly exciting, but walking into a craft store can also feel overwhelming with the sheer number of tools available. To help you get started without breaking the bank, we have compiled a list of the 10 absolute essential sewing tools every beginner needs.</p>
            
            <h4>1. High-Quality Fabric Shears</h4>
            <p>Never use your sewing scissors on paper! Fabric shears are specially designed to cut through fabric cleanly without fraying the edges. Invest in a good pair and keep them dedicated solely to fabric.</p>

            <h4>2. Flexible Measuring Tape</h4>
            <p>A soft, flexible measuring tape is essential for taking body measurements accurately and measuring curved pattern pieces.</p>

            <h4>3. Sewing Pins & Pincushion</h4>
            <p>Pins hold your fabric pieces together before you sew them. Glass-head pins are highly recommended because they won't melt if you accidentally iron over them.</p>

            <h4>4. Tailor's Chalk or Fabric Markers</h4>
            <p>Used to transfer pattern markings, darts, and cutting lines directly onto your fabric. These marks will wash out or fade away automatically.</p>

            <h4>5. A Reliable Seam Ripper</h4>
            <p>Mistakes happen to everyone, even professionals! A seam ripper is your best friend for quickly and safely removing stitches without damaging your fabric.</p>

            <h4>6. Hand Sewing Needles</h4>
            <p>Even if you use a sewing machine, you'll always need hand sewing needles for finishing touches, sewing buttons, or basting seams.</p>

            <h4>7. Thread Snips</h4>
            <p>A small, spring-loaded pair of snips kept next to your machine is incredibly convenient for clipping thread tails quickly.</p>

            <h4>8. Clear Acrylic Ruler</h4>
            <p>Perfect for drawing straight lines, measuring hems, and checking grainlines on your fabric.</p>

            <h4>9. An Iron & Ironing Board</h4>
            <p>The secret to professional-looking sewing is pressing your seams! Ironing every seam after you sew it makes a massive difference in the final look of your garment.</p>

            <h4>10. Quality Sewing Thread</h4>
            <p>Cheap thread breaks easily and can clog your machine. Always choose high-quality polyester or cotton thread (like the premium threads we offer at Devangi Products) for strong, lasting seams.</p>
        `
    },
    {
        title: "How to Choose the Perfect Thread for Your Fabric",
        category: "Materials",
        date: "Jun 22, 2026",
        image: "./assets/images/blog-2.png",
        content: `
            <p>Matching the right thread to your fabric is crucial for the durability and appearance of your project. Using the wrong thread can lead to puckered seams, broken threads, or even ruined fabric. Here is a simple guide to choosing the perfect thread:</p>

            <h4>1. All-Purpose Polyester Thread</h4>
            <p>This is the most common and versatile thread. Because polyester has a slight stretch, it is excellent for both woven and knit fabrics. It is strong, colorfast, and resistant to heat and chemicals. Use it for almost all everyday garments, cotton shirts, and synthetic materials.</p>

            <h4>2. 100% Cotton Thread</h4>
            <p>Cotton thread has very little stretch and a beautiful matte finish. It is ideal for 100% cotton fabrics, quilting, and heirloom sewing. Note: Because it has no stretch, do not use it on stretchy knit fabrics as the seams may pop.</p>

            <h4>3. Silk Thread</h4>
            <p>Silk thread is extremely smooth, strong, and thin. It is perfect for sewing silk and wool, and is often used for basting (temporary stitching) because it doesn't leave marks in the fabric when pulled out.</p>

            <h4>4. Heavy-Duty / Nylon Thread</h4>
            <p>If you are working with heavy materials like denim, canvas, upholstery, or leather, you need a heavy-duty nylon or extra-strong polyester thread. Standard threads will snap under the tension of these heavy fabrics.</p>

            <h4>5. Elastic Thread</h4>
            <p>Elastic thread is wound onto the bobbin and used to create beautiful gathers, shirring, and smocking on lightweight fabrics.</p>

            <p><strong>Pro Tip:</strong> When in doubt, match the thread fiber to the fabric fiber (e.g., use cotton thread for cotton fabric, polyester for synthetics). For color matching, choose a thread that is one shade darker than your fabric, as thread looks slightly lighter when stitched.</p>
        `
    },
    {
        title: "Step-by-Step Guide to Threading a Sewing Machine",
        category: "Tutorial",
        date: "Jun 25, 2026",
        image: "./assets/images/blog-3.png",
        content: `
            <p>Threading a sewing machine can feel like solving a puzzle for beginners. While different brands (Singer, Brother, Usha) have slight variations, the basic path remains the same. Follow this step-by-step guide to get it right every time:</p>

            <h4>Step 1: Turn off the Machine</h4>
            <p>Always turn off the power before threading for safety.</p>

            <h4>Step 2: Raise the Presser Foot & Needle</h4>
            <p>Make sure the needle is in its highest position by turning the handwheel towards you. Crucially, raise the presser foot—this opens the tension discs so the thread can slip between them properly.</p>

            <h4>Step 3: Place the Spool</h4>
            <p>Place your thread spool on the spool pin and secure it with a spool cap so it doesn't wobble.</p>

            <h4>Step 4: Follow the Thread Guides</h4>
            <p>Pull the thread across the top of the machine through the first metal thread guide. Follow the arrows printed on your machine.</p>

            <h4>Step 5: The U-Turn (Tension Discs)</h4>
            <p>Bring the thread down through the right channel, loop it around the bottom of the divider, and bring it back up through the left channel.</p>

            <h4>Step 6: Thread the Take-Up Lever</h4>
            <p>Pass the thread through the eye of the metal take-up lever from right to left. This lever moves up and down to pull thread from the spool.</p>

            <h4>Step 7: Lower Guides & Needle</h4>
            <p>Bring the thread down and pass it through the small wire guides near the needle bar. Finally, thread the needle from front to back. Leave a 4-5 inch tail of thread.</p>

            <h4>Step 8: Insert the Bobbin</h4>
            <p>Place your wound bobbin into the bobbin case. Turn the handwheel towards you while holding the top thread to catch and bring up the bobbin thread. Pull both threads to the back of the machine.</p>

            <p>You are now ready to sew! Happy sewing from the Devangi Sewing Store team.</p>
        `
    },
    {
        title: "A Guide to Different Types of Fabrics and Their Uses",
        category: "Fabrics",
        date: "Jun 28, 2026",
        image: "./assets/images/blog-4.png",
        content: `
            <p>Choosing the right fabric is half the battle in sewing. The drape, weight, and stretch of a fabric determine how your garment will fit and flow. Here is a guide to the most common fabrics and their ideal uses:</p>

            <h4>1. Cotton</h4>
            <p>The most beginner-friendly fabric. It is stable, easy to cut, doesn't slip, and presses beautifully. Perfect for shirts, summer dresses, pajamas, tote bags, and quilting.</p>

            <h4>2. Linen</h4>
            <p>Made from flax fibers, linen is highly breathable and has a signature textured look. It wrinkles easily, which is part of its relaxed charm. Ideal for summer trousers, shirts, dresses, and home linens.</p>

            <h4>3. Silk</h4>
            <p>A luxurious, slippery fabric with a gorgeous sheen and drape. It requires patience and pins to sew. Best for evening gowns, blouses, scarves, and premium linings.</p>

            <h4>4. Wool</h4>
            <p>A warm, durable natural fiber that is highly resilient. It is wonderful to sew because it responds well to steam pressing. Used for warm winter coats, suits, skirts, and blankets.</p>

            <h4>5. Polyester & Synthetics</h4>
            <p>Extremely durable, wrinkle-resistant, and quick-drying. Commonly blended with cotton to make everyday clothes. Ideal for activewear, lining, outerwear, and budget-friendly garments.</p>

            <h4>6. Knit Fabrics (Jersey, Rib-knit)</h4>
            <p>Unlike woven fabrics, knits are stretchy and comfortable. They require a ballpoint needle and a stretch stitch (like zigzag) to sew. Best for t-shirts, leggings, hoodies, and activewear.</p>

            <p>Before you begin any project, always pre-wash your fabric! Woven fabrics (especially cotton and linen) can shrink significantly during their first wash, and you don't want your finished garment to become too small.</p>
        `
    }
];

function initBlogModal() {
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach((card, index) => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            openBlogModal(index);
        });
        card.style.cursor = 'pointer';
    });
}

function openBlogModal(index) {
    const article = blogArticles[index];
    if (!article) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        padding: 20px;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
        background: #ffffff;
        border-radius: 20px;
        max-width: 700px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        position: relative;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
    `;

    container.innerHTML = `
        <button class="blog-modal-close" style="
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 10;
            font-size: 20px;
            color: #333;
            transition: all 0.2s ease;
        " onmouseover="this.style.transform='scale(1.1)';this.style.background='#fff';" onmouseout="this.style.transform='scale(1)';this.style.background='rgba(255, 255, 255, 0.9)';">
            ✕
        </button>

        <div style="width: 100%; height: 260px; overflow: hidden; position: relative; border-radius: 20px 20px 0 0; shrink-0;">
            <img src="${article.image}" alt="${article.title}" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position: absolute; bottom: 15px; left: 20px; background: var(--salmon-pink, #e83e8c); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${article.category}
            </div>
        </div>

        <div class="blog-modal-body" style="padding: 30px; overflow-y: auto; text-align: left;">
            <div style="font-size: 12px; color: #999; margin-bottom: 10px; display: flex; gap: 15px; align-items: center;">
                <span>By <strong>Devangi Products</strong></span>
                <span>•</span>
                <span>${article.date}</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; color: #222; margin-bottom: 20px; line-height: 1.3; font-family: 'Poppins', sans-serif;">
                ${article.title}
            </h2>
            <div class="blog-article-text" style="font-size: 14px; color: #444; line-height: 1.8; font-family: 'Poppins', sans-serif;">
                ${article.content}
            </div>
        </div>
    `;

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        .blog-article-text h4 {
            font-size: 16px;
            font-weight: 600;
            color: #222;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        .blog-article-text p {
            margin-bottom: 15px;
        }
    `;
    container.appendChild(styleTag);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = '1';
        container.style.transform = 'scale(1)';
    }, 10);

    const closeModal = () => {
        overlay.style.opacity = '0';
        container.style.transform = 'scale(0.9)';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    };

    container.querySelector('.blog-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

// Call initBlogModal at the end of DomContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initBlogModal();
});

