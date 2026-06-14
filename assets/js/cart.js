// Global Cart Logic
let cart = JSON.parse(localStorage.getItem('anon_cart')) || [];

function saveCart() {
    localStorage.setItem('anon_cart', JSON.stringify(cart));
    updateCartBadges();
}

function addToCart(product) {
    const productId = String(product.id);
    const existing = cart.find(item => String(item.id) === productId);
    if(existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, id: productId, quantity: 1 });
    }
    saveCart();
    
    // Redirect to cart page directly
    window.location.href = '/cart.html';
}

function updateCartBadges() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    // Find all bag icons and update count
    const badges = document.querySelectorAll('.header-user-actions .action-btn .count, .mobile-bottom-navigation .action-btn .count');
    badges.forEach(badge => {
        // Only update the badges next to bag icons
        if(badge.previousElementSibling && badge.previousElementSibling.name === 'bag-handle-outline') {
            badge.innerText = count;
        }
    });
}

// Global Event Delegation for Add To Cart buttons
document.addEventListener('click', (e) => {
    // Traverse up to find the button
    const btn = e.target.closest('.btn-action, .add-to-cart-btn');
    if(!btn) return;

    // Check if the button is specifically an add to cart button (either class exists or it contains the bag icon)
    const isCartBtn = btn.classList.contains('add-to-cart-btn') || (btn.querySelector('ion-icon') && btn.querySelector('ion-icon').name.includes('bag-add'));
    
    if(isCartBtn) {
        e.preventDefault();
        
        let id = btn.getAttribute('data-id');
        let title = btn.getAttribute('data-title');
        let price = btn.getAttribute('data-price');
        let image = btn.getAttribute('data-image');
        
        // If it's a static template button without data attributes, extract from DOM
        if(!id || !title || !price) {
            const showcase = btn.closest('.showcase');
            if(showcase) {
                const titleEl = showcase.querySelector('.showcase-title');
                const priceEl = showcase.querySelector('.price');
                const imgEl = showcase.querySelector('.showcase-img, .product-img');
                
                title = titleEl ? titleEl.innerText.trim() : 'Unknown Product';
                // Remove $ and parse
                price = priceEl ? parseFloat(priceEl.innerText.replace(/[^0-9.]/g, '')) : 0;
                image = imgEl ? imgEl.src : '/assets/images/products/1.jpg';
                
                // use title as id for static products
                id = title.toLowerCase().replace(/ /g, '-');
            }
        } else {
            price = parseFloat(price);
        }

        if(id && title && price > 0) {
            addToCart({ id, title, price, image });
        } else {
            console.error("Could not find product details to add to cart.");
        }
    }
});

function initCartButtons() {
    updateCartBadges();
}

// Initial validation on load
document.addEventListener('DOMContentLoaded', () => {
    initCartButtons();

    // Attach navigation links to header icons
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        if(!btn) return;
        
        const icon = btn.querySelector('ion-icon');
        if(icon) {
            if(icon.name === 'person-outline') {
                window.location.href = '/login.html';
                e.preventDefault();
            } else if(icon.name === 'bag-handle-outline' || icon.name === 'bag-outline') {
                window.location.href = '/cart.html';
                e.preventDefault();
            }
        }
    });

});
