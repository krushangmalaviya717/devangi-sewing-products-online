// ===== Global Utils =====
function formatDateDDMMYYYY(dateInput, includeTime = false) {
    if (!dateInput) return '—';
    let date;
    
    // If the input is a SQLite UTC string (has space or T but no Z/offset), treat it as UTC
    if (typeof dateInput === 'string') {
        let normalized = dateInput.trim();
        if (!/Z|[+-]\d{2}:?\d{2}$/.test(normalized) && (normalized.includes(' ') || normalized.includes('T'))) {
            normalized = normalized.replace(' ', 'T') + 'Z';
        }
        date = new Date(normalized);
    } else {
        date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return dateInput;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    if (!includeTime) {
        return `${day}-${month}-${year}`;
    }

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
}

function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] transform transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-3 border border-gray-700';
    toast.innerHTML = `
        <span class="text-lg">✨</span>
        <span class="font-medium text-sm">${message}</span>
    `;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 10);

    // Remove
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }
}

// ===== Global Search Logic =====
function triggerGlobalSearch() {
    const query = document.getElementById('global-search')?.value;
    if (query) handleGlobalSearch(query);
}

function handleGlobalSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        // Reset view if empty
        if (document.getElementById('products-table-body')) fetchProducts();
        if (document.getElementById('users-table-body')) fetchUsers();
        if (document.getElementById('orders-table-body')) loadOrders();
        return;
    }

    // Check if we are on orders page
    const orderTable = document.getElementById('orders-table-body');
    if (orderTable) {
        const localSearch = document.getElementById('order-search');
        if (localSearch) {
            localSearch.value = query;
            debounceLoadOrders();
            return;
        }
    }

    // Check if we are on products page
    const productTable = document.getElementById('products-table-body');
    if (productTable) {
        const rows = productTable.querySelectorAll('tr');
        let found = false;
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            if (text.includes(q)) {
                row.style.display = '';
                found = true;
            } else {
                row.style.display = 'none';
            }
        });
        if (!found) {
            // Optional: show "no results" row if all hidden
        }
        return;
    }

    // Check if we are on users page
    const userTable = document.getElementById('users-table-body');
    if (userTable) {
        const rows = userTable.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
        return;
    }

    // Fallback: Redirect to orders if searching from other pages (Dashboard, Banners, etc.)
    window.location.href = `orders.html?q=${encodeURIComponent(query)}`;
}

function handleDateRangeChange(val) {
    const startInput = document.getElementById('order-start-date');
    const endInput = document.getElementById('order-end-date');
    const container = document.getElementById('custom-date-container');
    
    if (!startInput || !endInput) return;

    const now = new Date();
    // Use local date for "today"
    const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    if (val === 'custom') {
        container.classList.remove('hidden');
        return; // Let user pick
    } else {
        container.classList.add('hidden');
    }

    if (val === 'all') {
        startInput.value = '';
        endInput.value = '';
    } else if (val === 'today') {
        startInput.value = today;
        endInput.value = today;
    } else if (val === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startInput.value = yesterday.toLocaleDateString('en-CA');
        endInput.value = yesterday.toLocaleDateString('en-CA');
    } else if (val === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startInput.value = startOfMonth.toLocaleDateString('en-CA');
        endInput.value = today;
    } else if (val === 'this_year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startInput.value = startOfYear.toLocaleDateString('en-CA');
        endInput.value = today;
    }
    
    loadOrders();
}

// ===== Image Preview Logic (Add Form) =====
let selectedFiles = [];

// ===== Edit Image Preview Logic =====
let editSelectedFiles = [];
let editKeepImages = []; // tracks existing images to keep

function previewImages(event) {
    const files = Array.from(event.target.files);
    const MAX = 10;

    // Merge with already selected, cap at 10
    selectedFiles = [...selectedFiles, ...files].slice(0, MAX);

    // Update the file input with a DataTransfer object (to keep selected files in sync)
    const dt = new DataTransfer();
    selectedFiles.forEach(f => dt.items.add(f));
    document.getElementById('imageInput').files = dt.files;

    renderPreviews();
}

function renderPreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    const countEl = document.getElementById('imageCount');

    if (selectedFiles.length === 0) {
        grid.style.display = 'none';
        countEl.textContent = '';
        return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = '';
    countEl.textContent = `${selectedFiles.length} image(s) selected (max 10)`;

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="remove-btn" onclick="removeImage(${index})" title="Remove">✕</button>
                ${index === 0 ? '<span style="position:absolute;bottom:2px;left:2px;background:rgba(236,72,153,0.85);color:white;font-size:9px;padding:1px 4px;border-radius:4px;">Main</span>' : ''}
            `;
            grid.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(index) {
    selectedFiles.splice(index, 1);
    // Rebuild DataTransfer
    const dt = new DataTransfer();
    selectedFiles.forEach(f => dt.items.add(f));
    document.getElementById('imageInput').files = dt.files;
    renderPreviews();
}

// ===== Edit Image Preview =====
function previewEditImages(event) {
    const files = Array.from(event.target.files);
    editSelectedFiles = files.slice(0, 10);
    const dt = new DataTransfer();
    editSelectedFiles.forEach(f => dt.items.add(f));
    document.getElementById('editImageInput').files = dt.files;
    renderEditNewPreviews();
}

function renderEditNewPreviews() {
    const grid = document.getElementById('editImagePreviewGrid');
    const countEl = document.getElementById('editImageCount');
    if (editSelectedFiles.length === 0) {
        grid.style.display = 'none';
        countEl.textContent = '';
        return;
    }
    grid.style.display = 'grid';
    grid.innerHTML = '';
    countEl.textContent = `${editSelectedFiles.length} new image(s) selected — will replace existing images`;
    editSelectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.innerHTML = `
                <img src="${e.target.result}" alt="New ${index + 1}">
                ${index === 0 ? '<span style="position:absolute;bottom:2px;left:2px;background:rgba(236,72,153,0.85);color:white;font-size:9px;padding:1px 4px;border-radius:4px;">Main</span>' : ''}
            `;
            grid.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
}

function removeKeepImage(index) {
    editKeepImages.splice(index, 1);
    document.getElementById('edit_keep_images').value = JSON.stringify(editKeepImages);
    renderEditExistingImages();
}

function renderEditExistingImages() {
    const container = document.getElementById('edit_existing_images');
    container.innerHTML = '';
    if (editKeepImages.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400">No existing images.</p>';
        return;
    }
    editKeepImages.forEach((src, idx) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${src}" alt="Image ${idx + 1}">
            <button type="button" class="remove-btn" onclick="removeKeepImage(${idx})" title="Remove">✕</button>
            ${idx === 0 ? '<span style="position:absolute;bottom:2px;left:2px;background:rgba(236,72,153,0.85);color:white;font-size:9px;padding:1px 4px;border-radius:4px;">Main</span>' : ''}
        `;
        container.appendChild(item);
    });
    document.getElementById('edit_keep_images').value = JSON.stringify(editKeepImages);
}

// Global list of products for related products selection
window.allProductsList = [];

function populateRelatedProductsSelects(excludeProductId = null, selectedIds = []) {
    try {
        const addSelect = document.querySelector('#addProductForm select[name="related_products_select"]');
        const editSelect = document.querySelector('#editProductForm select[name="related_products_select"]');
        
        const products = window.allProductsList || [];

        const buildOptionsHtml = (selectEl, isEdit) => {
            if (!selectEl) return;
            selectEl.innerHTML = '';
            
            if (products.length === 0) {
                const opt = document.createElement('option');
                opt.disabled = true;
                opt.innerText = 'No products found';
                selectEl.appendChild(opt);
                return;
            }

            products.forEach(p => {
                try {
                    if (!p) return;
                    if (isEdit && parseInt(p.id) === parseInt(excludeProductId)) return;
                    
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    const priceVal = p.price ? parseFloat(p.price) : 0;
                    opt.innerText = `#${p.id} - ${p.title || 'Untitled'} (Rs. ${priceVal.toFixed(2)})`;
                    
                    if (isEdit && Array.isArray(selectedIds) && selectedIds.map(Number).includes(Number(p.id))) {
                        opt.selected = true;
                    }
                    selectEl.appendChild(opt);
                } catch (innerErr) {
                    console.error('Error adding option for product:', p, innerErr);
                }
            });
        };

        if (addSelect) buildOptionsHtml(addSelect, false);
        if (editSelect) buildOptionsHtml(editSelect, true);
    } catch (err) {
        console.error('Error populating related products select:', err);
    }
}

// ===== Open Edit Modal =====
async function openEditModal(id) {
    try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error('Product not found');
        const p = await res.json();

        // Fill form fields
        document.getElementById('edit_product_id').value = p.id;
        document.getElementById('edit_title').value = p.title || '';
        document.getElementById('edit_badge').value = p.badge || '';
        document.getElementById('edit_price').value = p.price || '';
        document.getElementById('edit_original_price').value = p.original_price || '';
        document.getElementById('edit_rating').value = p.rating || 4.9;
        if (document.getElementById('edit_stock')) document.getElementById('edit_stock').value = p.stock !== undefined ? p.stock : -1;
        document.getElementById('edit_description').value = p.description || '';
        document.getElementById('edit_offer_text').value = p.offer_text || '';

        // Sizes — convert array to comma string
        const sizesArr = Array.isArray(p.sizes) ? p.sizes : [];
        document.getElementById('edit_sizes').value = sizesArr.join(', ');

        // Existing images
        editKeepImages = Array.isArray(p.images) && p.images.length > 0
            ? [...p.images]
            : (p.image ? [p.image] : []);
        renderEditExistingImages();

        // Parse and select related products
        const selectedRelatedIds = p.related_products 
            ? p.related_products.split(',').map(id => parseInt(id.trim())).filter(Boolean)
            : [];
        populateRelatedProductsSelects(p.id, selectedRelatedIds);

        // Reset new image upload
        editSelectedFiles = [];
        document.getElementById('editImageInput').value = '';
        document.getElementById('editImagePreviewGrid').innerHTML = '';
        document.getElementById('editImagePreviewGrid').style.display = 'none';
        document.getElementById('editImageCount').textContent = '';

        // Load and set category dropdown
        await refreshEditModalCategories(p.category);

        toggleModal('editModal');
    } catch (err) {
        console.error('Error loading product for edit:', err);
        alert('Could not load product details.');
    }
}

// ===== DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', () => {
    // Check permission-based sidebar filtering
    checkAdminPermissions();

    // Determine which page we are on and only fetch necessary data
    if (document.getElementById('products-table-body')) fetchProducts();
    if (document.getElementById('users-table-body')) fetchUsers();
    if (document.getElementById('nav-table-body')) fetchNavLinks();
    if (document.getElementById('categories-table-body') || 
        document.getElementById('add_category_select') || 
        document.getElementById('edit_category_select')) fetchCategories();
    if (document.getElementById('banners-table-body')) {
        fetchBanners();
        initCropperListeners();
    }
    if (document.getElementById('orders-table-body')) {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
            const searchInput = document.getElementById('order-search');
            if (searchInput) searchInput.value = q;
        }
        
        loadOrders();
        loadAdminShippingSettings();
        
        // Bind pincode / phone events for manual order
        const moPincode = document.getElementById('mo_pincode');
        if (moPincode) {
            moPincode.addEventListener('input', () => {
                const pin = moPincode.value.trim();
                if (pin.length >= 2) {
                    const detectedState = getStateFromPincode(pin);
                    if (detectedState) {
                        const stateInput = document.getElementById('mo_state');
                        if (stateInput) stateInput.value = detectedState;
                    }
                }
                recalculateManualOrderShipping();
                updateManualOrderSummary();
            });
        }
        const moPhone = document.getElementById('mo_phone');
        if (moPhone) {
            moPhone.addEventListener('input', () => {
                validateAdminPhone('mo_phone', 'mo_phone_error');
            });
        }
        
        // Bind pincode / phone events for edit order
        const eoPincode = document.getElementById('eo_pincode');
        if (eoPincode) {
            eoPincode.addEventListener('input', () => {
                const pin = eoPincode.value.trim();
                if (pin.length >= 2) {
                    const detectedState = getStateFromPincode(pin);
                    if (detectedState) {
                        const stateInput = document.getElementById('eo_state');
                        if (stateInput) stateInput.value = detectedState;
                    }
                }
                recalculateEditOrderShipping();
                updateEditOrderSummary();
            });
        }
        const eoPhone = document.getElementById('eo_phone');
        if (eoPhone) {
            eoPhone.addEventListener('input', () => {
                validateAdminPhone('eo_phone', 'eo_phone_error');
            });
        }
        
        const openOrderId = params.get('open_order');
        if (openOrderId) {
            setTimeout(() => { openOrderDetail(openOrderId); }, 300);
        }
    }

    // Notification badge polling
    updateNotificationBadge();
    setInterval(updateNotificationBadge, 30000); // every 30s

    // Highlight active nav based on current URL
    const currentPath = window.location.pathname;
    const navMapping = {
        'products.html': 'products',
        'users.html': 'users',
        'navigation.html': 'nav',
        'categories.html': 'categories',
        'banners.html': 'banners',
        'orders.html': 'orders'
    };

    Object.entries(navMapping).forEach(([path, section]) => {
        if (currentPath.includes(path)) {
            const btn = document.getElementById('nav-' + section);
            if (btn) {
                btn.classList.remove('text-gray-600', 'hover:bg-gray-100');
                btn.classList.add('bg-pink-50', 'text-pink-600');
            }
        }
    });

    // Edit Product Form Submit
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit_product_id').value;
            const formData = new FormData(editProductForm);
            // Remove the product_id field — it's in the URL
            formData.delete('product_id');

            // Append related products
            const selectedRelated = Array.from(editProductForm.elements['related_products_select'].selectedOptions).map(opt => opt.value);
            formData.append('related_products', selectedRelated.join(','));

            try {
                const res = await fetch(`/api/products/${id}`, {
                    method: 'PUT',
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    toggleModal('editModal');
                    fetchProducts();
                    showToast('Product updated successfully! ✅');
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (err) {
                console.error('Error updating product:', err);
                alert('Failed to update product.');
            }
        });
    }

    // Add Product Form Submit
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(addProductForm);

            // Append related products
            const selectedRelated = Array.from(addProductForm.elements['related_products_select'].selectedOptions).map(opt => opt.value);
            formData.append('related_products', selectedRelated.join(','));

            try {
                const res = await fetch('/api/products', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (res.ok) {
                    toggleModal('addModal');
                    addProductForm.reset();
                    selectedFiles = [];
                    renderPreviews();
                    fetchProducts();
                    showToast('Product added successfully! ✅');
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error adding product:', error);
                alert('Failed to add product.');
            }
        });
    }

    // Add Nav Form Submit
    const addNavForm = document.getElementById('addNavForm');
    if (addNavForm) {
        addNavForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bodyData = {
                title: document.getElementById('nav_title').value,
                url: document.getElementById('nav_url').value,
                sort_order: parseInt(document.getElementById('nav_sort_order').value)
            };
            try {
                const res = await fetch('/api/admin/nav', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
                if (res.ok) {
                    toggleModal('addNavModal');
                    addNavForm.reset();
                    fetchNavLinks();
                    showToast('Navigation item added! ✅');
                } else {
                    alert('Failed to add navigation item.');
                }
            } catch (error) {
                console.error(error);
            }
        });
    }

    // Add Category Form Submit
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cat_name').value.trim();
            const icon = document.getElementById('cat_icon').value.trim() || '🏷️';
            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, icon })
                });
                const data = await res.json();
                if (res.ok) {
                    toggleModal('addCategoryModal');
                    addCategoryForm.reset();
                    document.getElementById('cat_icon').value = '🏷️';
                    fetchCategories();
                    showToast(`Category "${name}" added! ✅`);
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to add category.');
            }
        });
    }

    // Edit Category Form Submit
    const editCategoryForm = document.getElementById('editCategoryForm');
    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit_cat_id').value;
            const name = document.getElementById('edit_cat_name').value.trim();
            const icon = document.getElementById('edit_cat_icon').value.trim() || '🏷️';
            try {
                const res = await fetch(`/api/categories/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, icon })
                });
                const data = await res.json();
                if (res.ok) {
                    toggleModal('editCategoryModal');
                    fetchCategories();
                    fetchProducts(); // refresh since product categories may have changed
                    showToast(`Category updated! ✅`);
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to update category.');
            }
        });
    }
    // Add Banner Form Submit
    const addBannerForm = document.getElementById('addBannerForm');
    if (addBannerForm) {
        addBannerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addBannerForm);
            
            // Override fields with cropped files if any
            if (croppedFiles['add_image_input']) {
                formData.set('image', croppedFiles['add_image_input']);
            }

            try {
                const res = await fetch('/api/banners', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    toggleModal('addBannerModal');
                    addBannerForm.reset();
                    resetBannerForm('addBannerForm');
                    fetchBanners();
                    showToast('Hero banner added! ✅');
                } else {
                    const data = await res.json();
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error(error);
            }
        });
    }

    // Edit Banner Form Submit
    const editBannerForm = document.getElementById('editBannerForm');
    if (editBannerForm) {
        editBannerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit_banner_id').value;
            const formData = new FormData(editBannerForm);

            // Override fields with cropped files if any
            if (croppedFiles['edit_image_input']) {
                formData.set('image', croppedFiles['edit_image_input']);
            }

            try {
                const res = await fetch(`/api/banners/${id}`, {
                    method: 'PUT',
                    body: formData
                });
                if (res.ok) {
                    toggleModal('editBannerModal');
                    resetBannerForm('editBannerForm');
                    fetchBanners();
                    showToast('Hero banner updated! ✅');
                } else {
                    const data = await res.json();
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error(error);
            }
        });
    }
});

// ===== Fetch & Render Products =====
async function fetchProducts() {
    try {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const res = await fetch('/api/products');
        const products = await res.json();

        window.allProductsList = products;
        populateRelatedProductsSelects(null, []);

        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">No products yet. Click "+ Add New Product" to get started!</td></tr>`;
            return;
        }

        products.forEach(p => {
            const images = Array.isArray(p.images) ? p.images : [p.image];
            const displayImg = images[0] || p.image;
            const imgCount = images.length;

            const badgeHtml = p.badge && p.badge !== 'None'
                ? `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${getBadgeColor(p.badge)}">${p.badge}</span>`
                : '<span class="text-gray-300 text-xs">—</span>';

            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4">
                    <div class="relative">
                        <img src="${displayImg}" alt="${p.title}" class="w-14 h-14 rounded-lg object-cover border border-gray-200">
                        ${imgCount > 1 ? `<span class="absolute -bottom-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">${imgCount}</span>` : ''}
                    </div>
                </td>
                <td class="p-4">
                    <p class="font-medium text-gray-800">${p.title}</p>
                    ${p.description ? `<p class="text-xs text-gray-400 mt-1 truncate max-w-xs">${p.description}</p>` : ''}
                    ${p.sizes ? `<p class="text-xs text-pink-400 mt-1">Sizes: ${JSON.parse(p.sizes || '[]').join(', ')}</p>` : ''}
                </td>
                <td class="p-4 text-gray-500">
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs">${p.category}</span>
                </td>
                <td class="p-4">
                    <span class="font-medium text-pink-500">Rs. ${parseFloat(p.price).toFixed(2)}</span>
                    ${p.original_price ? `<br><del class="text-xs text-gray-400">Rs. ${parseFloat(p.original_price).toFixed(2)}</del>` : ''}
                </td>
                <td class="p-4">
                    ${p.stock === -1 || p.stock === null || p.stock === undefined 
                        ? '<span class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">∞ Unlimited</span>' 
                        : p.stock === 0 
                            ? '<span class="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-bold">Out of Stock</span>' 
                            : p.stock <= 5 
                                ? `<span class="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">${p.stock} left ⚠️</span>` 
                                : `<span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium">${p.stock}</span>`
                    }
                </td>
                <td class="p-4">${badgeHtml}</td>
                <td class="p-4">
                    <div class="flex items-center gap-2">
                        <button onclick="openEditModal(${p.id})" class="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Product">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="deleteProduct(${p.id})" class="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Product">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

function getBadgeColor(badge) {
    const colors = {
        'New': 'bg-blue-100 text-blue-700',
        'Sale': 'bg-red-100 text-red-700',
        'Hot': 'bg-orange-100 text-orange-700',
        'Trending': 'bg-purple-100 text-purple-700',
        'Best Seller': 'bg-green-100 text-green-700',
        'Limited': 'bg-yellow-100 text-yellow-700'
    };
    return colors[badge] || 'bg-gray-100 text-gray-700';
}

// ===== Delete Product =====
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });

        if (res.ok) {
            fetchProducts();
            showToast('Product deleted.');
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product.');
    }
}

// ===== Toggle Modal =====
function toggleModal(modalID) {
    const modal = document.getElementById(modalID);
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        // Reset when opening
        if (modalID === 'addBannerModal') {
            const form = document.getElementById('addBannerForm');
            if (form) form.reset();
            if (typeof resetBannerForm === 'function') resetBannerForm('addBannerForm');
            
            // Calculate and set next sort order
            const sortOrderInput = document.querySelector('#addBannerForm input[name="sort_order"]');
            if (sortOrderInput) {
                let maxOrder = 0;
                if (currentBanners && currentBanners.length > 0) {
                    maxOrder = Math.max(...currentBanners.map(b => b.sort_order || 0));
                }
                sortOrderInput.value = maxOrder + 1;
            }
        }
    } else {
        modal.classList.add('hidden');
        // Reset when closing
        if (modalID === 'addBannerModal') {
            if (typeof resetBannerForm === 'function') resetBannerForm('addBannerForm');
        } else if (modalID === 'editBannerModal') {
            if (typeof resetBannerForm === 'function') resetBannerForm('editBannerForm');
        }
    }
}



// ===== Fetch Users =====
async function fetchUsers() {
    try {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        const month = document.getElementById('user-month-filter')?.value || '';
        const year = document.getElementById('user-year-filter')?.value || '';

        const res = await fetch(`/api/users?month=${month}&year=${year}`);
        const users = await res.json();

        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No users found.</td></tr>`;
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-medium text-gray-800">#${u.id}</td>
                <td class="p-4"><a href="user_details.html?email=${encodeURIComponent(u.email)}" class="hover:text-pink-600 hover:underline font-bold text-gray-800">${u.fullname}</a></td>
                <td class="p-4 text-gray-600">${u.email}</td>
                <td class="p-4 text-gray-500 text-xs">${formatDateDDMMYYYY(u.created_at)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Fetch users error:', err);
    }
}

// ===== Fetch Nav Links =====
async function fetchNavLinks() {
    try {
        const res = await fetch('/api/admin/nav');
        const navs = await res.json();

        const tbody = document.getElementById('nav-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!navs || navs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">No navigation items found.</td></tr>`;
            return;
        }

        navs.forEach(n => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-medium text-gray-500">${n.sort_order}</td>
                <td class="p-4 font-medium text-gray-800">${n.title}</td>
                <td class="p-4 text-gray-500">${n.url}</td>
                <td class="p-4">
                    <button onclick="toggleNavStatus(${n.id}, ${n.is_active})" class="px-2 py-1 text-xs rounded ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${n.is_active ? 'Visible' : 'Hidden'}
                    </button>
                </td>
                <td class="p-4 flex space-x-2">
                    <button onclick="deleteNav(${n.id})" class="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching nav links:', error);
    }
}

async function toggleNavStatus(id, currentStatus) {
    try {
        const res = await fetch(`/api/admin/nav/${id}/toggle`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !currentStatus })
        });
        if (res.ok) fetchNavLinks();
    } catch (error) {
        console.error('Error toggling status:', error);
    }
}

async function deleteNav(id) {
    if (!confirm('Are you sure you want to delete this navigation link?')) return;
    try {
        const res = await fetch(`/api/admin/nav/${id}`, { method: 'DELETE' });
        if (res.ok) fetchNavLinks();
    } catch (error) {
        console.error('Error deleting nav link:', error);
    }
}

// ===== Toast Notification =====
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: #1f2937; color: white; padding: 12px 20px;
        border-radius: 10px; font-size: 14px; font-family: Poppins, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: fadeIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== CATEGORIES =====

async function fetchCategories() {
    try {
        // 1. Render in table
        const tbody = document.getElementById('categories-table-body');
        const addSelect = document.getElementById('add_category_select');
        const editSelect = document.getElementById('edit_category_select');

        // Only fetch if we need to display or populate dropdowns
        if (!tbody && !addSelect && !editSelect) return;

        const res = await fetch('/api/categories');
        const cats = await res.json();

        if (tbody) {
            tbody.innerHTML = '';
            if (cats.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-400">No categories yet.</td></tr>`;
            } else {
                cats.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
                    tr.innerHTML = `
                        <td class="p-4 text-2xl">${c.icon && c.icon.startsWith('/') ? `<img src="${c.icon}" class="w-10 h-10 object-cover rounded border border-gray-200">` : (c.icon || '🏷️')}</td>
                        <td class="p-4 font-medium text-gray-800">${c.name}</td>
                        <td class="p-4 text-center">
                            <span class="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-semibold">${c.product_count} product${c.product_count !== 1 ? 's' : ''}</span>
                        </td>
                        <td class="p-4">
                            <div class="flex items-center gap-2">
                                <button onclick="openEditCategoryModal(${c.id}, '${c.name.replace(/'/g, "\\'")}',' ${(c.icon || '🏷️').trim()}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button onclick="deleteCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')"
                                    class="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        // 2. Populate category dropdowns in Add + Edit product modals
        populateCategoryDropdown('add_category_select', cats, null);
        populateCategoryDropdown('edit_category_select', cats, null);

    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

function populateCategoryDropdown(selectId, cats, selectedValue) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Category --</option>';
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.icon || ''} ${c.name}`;
        if (selectedValue && c.name === selectedValue) opt.selected = true;
        sel.appendChild(opt);
    });
}

function openEditCategoryModal(id, name, icon) {
    document.getElementById('edit_cat_id').value = id;
    document.getElementById('edit_cat_name').value = name.trim();
    const iconVal = icon.trim();
    document.getElementById('edit_cat_icon').value = iconVal;
    
    // Update preview if it's an image
    const preview = document.getElementById('edit_cat_icon_preview');
    const placeholder = document.getElementById('edit_cat_icon_placeholder');
    if (preview && placeholder) {
        if (iconVal.startsWith('/')) {
            preview.src = iconVal;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
            placeholder.textContent = iconVal || '🏷️';
        }
    }
    
    toggleModal('editCategoryModal');
}

async function uploadCategoryIcon(type) {
    const fileInput = document.getElementById(`${type}_cat_file`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch('/api/admin/settings/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            const preview = document.getElementById(`${type}_cat_icon_preview`);
            const placeholder = document.getElementById(`${type}_cat_icon_placeholder`);
            const hiddenInput = document.getElementById(type === 'add' ? 'cat_icon' : 'edit_cat_icon');
            
            if (preview) {
                preview.src = data.filePath;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (hiddenInput) hiddenInput.value = data.filePath;
            
            showToast('Category icon uploaded!');
        } else {
            alert('Upload failed: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Error uploading file');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Delete category "${name}"? Products using this category will keep their category label but it won't appear in filters.`)) return;
    try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchCategories();
            showToast(`Category "${name}" deleted.`);
        } else {
            alert('Failed to delete category.');
        }
    } catch (err) {
        console.error(err);
    }
}

// Populate category dropdown after edit modal opens
async function refreshEditModalCategories(selectedCategory) {
    try {
        const catRes = await fetch('/api/categories');
        const cats = await catRes.json();
        populateCategoryDropdown('edit_category_select', cats, selectedCategory);
    } catch (err) {
        console.error('Error loading categories for edit modal:', err);
    }
}
// ===== BANNERS =====
let currentBanners = [];

async function fetchBanners() {
    try {
        const tbody = document.getElementById('banners-table-body');
        if (!tbody) return;

        const res = await fetch('/api/banners');
        const banners = await res.json();
        currentBanners = banners || [];

        tbody.innerHTML = '';

        if (!banners || banners.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400">No banners added. Click "+ Add New Banner" to get started!</td></tr>`;
            return;
        }

        banners.forEach(b => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4">
                    <img src="${b.image_url}" class="w-24 h-12 rounded object-cover border border-gray-100">
                </td>
                <td class="p-4">
                    <p class="text-sm font-medium text-gray-800 truncate max-w-[250px]" title="${b.link_url}">${b.link_url || 'No redirect link'}</p>
                    ${b.open_new_tab ? `<span class="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mt-1 inline-block">New Tab</span>` : ''}
                </td>
                <td class="p-4 text-center font-bold text-gray-400">${b.sort_order}</td>
                <td class="p-4 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${b.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${b.status ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="p-4">
                    <div class="flex items-center gap-2">
                        <button onclick="openEditBannerModal(${b.id})" class="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="deleteBanner(${b.id})" class="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching banners:', err);
    }
}

async function openEditBannerModal(id) {
    try {
        const res = await fetch('/api/banners');
        const banners = await res.json();
        const b = banners.find(item => item.id == id);
        if (!b) return;

        // Reset any leftover cropped files for edit
        resetBannerForm('editBannerForm');

        document.getElementById('edit_banner_id').value = b.id;
        document.getElementById('edit_banner_link_url').value = b.link_url || '';
        document.getElementById('edit_banner_sort_order').value = b.sort_order || 0;

        document.getElementById('edit_banner_status').checked = b.status === 1;
        document.getElementById('edit_banner_open_new_tab').checked = b.open_new_tab === 1;

        // Populate existing previews in Edit modal
        const editDesktopPreview = document.getElementById('edit_image_preview');
        const editDesktopContainer = document.getElementById('edit_image_preview_container');
        if (editDesktopPreview && editDesktopContainer) {
            editDesktopPreview.src = b.image_url;
            editDesktopContainer.classList.remove('hidden');
        }

        toggleModal('editBannerModal');
    } catch (err) {
        console.error(err);
    }
}

async function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return;
    try {
        const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchBanners();
            showToast('Banner deleted.');
        } else {
            alert('Failed to delete banner.');
        }
    } catch (err) {
        console.error(err);
    }
}

// ===== Banner Image Cropping Logic =====
let cropperInstance = null;
let currentCropTargetInputId = null;
let currentCropTargetPreviewId = null;
let currentCropTargetContainerId = null;

let croppedFiles = {
    add_image_input: null,
    add_mobile_image_input: null,
    edit_image_input: null,
    edit_mobile_image_input: null
};

function initCropperListeners() {
    const fileInputs = [
        { inputId: 'add_image_input', previewId: 'add_image_preview', containerId: 'add_image_preview_container', defaultRatio: 2.66 },
        { inputId: 'edit_image_input', previewId: 'edit_image_preview', containerId: 'edit_image_preview_container', defaultRatio: 2.66 }
    ];

    fileInputs.forEach(({ inputId, previewId, containerId, defaultRatio }) => {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Clone the input to clean any previous event listeners (prevents multiple registrations)
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                openCropper(event.target.result, inputId, previewId, containerId, defaultRatio);
            };
            reader.readAsDataURL(file);
        });
    });
}

function openCropper(imageSrc, inputId, previewId, containerId, defaultRatio) {
    currentCropTargetInputId = inputId;
    currentCropTargetPreviewId = previewId;
    currentCropTargetContainerId = containerId;

    const cropperModal = document.getElementById('cropperModal');
    const cropperImage = document.getElementById('cropper-image');
    if (!cropperModal || !cropperImage) return;
    
    cropperImage.src = imageSrc;
    cropperImage.classList.remove('hidden');
    cropperModal.classList.remove('hidden');
    cropperModal.classList.add('flex');

    if (cropperInstance) {
        cropperInstance.destroy();
    }

    cropperInstance = new Cropper(cropperImage, {
        aspectRatio: defaultRatio,
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
        background: false
    });
}

function setCropAspectRatio(ratio) {
    if (cropperInstance) {
        cropperInstance.setAspectRatio(ratio);
    }
}

function closeCropperModal() {
    const cropperModal = document.getElementById('cropperModal');
    if (cropperModal) {
        cropperModal.classList.add('hidden');
        cropperModal.classList.remove('flex');
    }
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    // Reset file input if user cancelled and no cropped file was saved yet
    if (!croppedFiles[currentCropTargetInputId]) {
        const input = document.getElementById(currentCropTargetInputId);
        if (input) input.value = '';
    }
}

function applyCrop() {
    if (!cropperInstance) return;

    cropperInstance.getCroppedCanvas({
        maxWidth: 1920,
        maxHeight: 1080,
        imageSmoothingQuality: 'high'
    }).toBlob((blob) => {
        if (!blob) return;

        const originalInput = document.getElementById(currentCropTargetInputId);
        const originalFileName = originalInput && originalInput.files[0] ? originalInput.files[0].name : 'cropped-banner.jpg';
        const croppedFile = new File([blob], originalFileName, { type: blob.type });

        // Save file
        croppedFiles[currentCropTargetInputId] = croppedFile;

        // Show preview thumbnail
        const previewImg = document.getElementById(currentCropTargetPreviewId);
        const containerDiv = document.getElementById(currentCropTargetContainerId);
        if (previewImg && containerDiv) {
            previewImg.src = URL.createObjectURL(blob);
            containerDiv.classList.remove('hidden');
        }

        closeCropperModal();
    }, 'image/jpeg', 0.9);
}

function resetBannerForm(formId) {
    if (formId === 'addBannerForm') {
        croppedFiles['add_image_input'] = null;
        
        const deskContainer = document.getElementById('add_image_preview_container');
        if (deskContainer) deskContainer.classList.add('hidden');
    } else if (formId === 'editBannerForm') {
        croppedFiles['edit_image_input'] = null;
        
        const deskContainer = document.getElementById('edit_image_preview_container');
        if (deskContainer) deskContainer.classList.add('hidden');
    }
}

// ===== ORDERS MANAGEMENT (PROFESSIONAL VERSION V3) =====
let currentOrdersPage = 1;
let ordersLimit = 10;
let ordersDebounceTimer;

function debounceLoadOrders() {
    clearTimeout(ordersDebounceTimer);
    ordersDebounceTimer = setTimeout(() => {
        currentOrdersPage = 1;
        loadOrders();
    }, 500);
}

async function loadOrders(page = 1) {
    currentOrdersPage = page;
    const status = document.getElementById('order-status-filter')?.value || '';
    const startDate = document.getElementById('order-start-date')?.value || '';
    const endDate = document.getElementById('order-end-date')?.value || '';
    const q = document.getElementById('order-search')?.value || '';
    const month = document.getElementById('order-month-filter')?.value || '';
    const year = document.getElementById('order-year-filter')?.value || '';
    
    try {
        const res = await fetch(`/api/admin/orders?status=${status}&startDate=${startDate}&endDate=${endDate}&month=${month}&year=${year}&q=${q}&page=${page}&limit=${ordersLimit}`);
        const data = await res.json();
        const orders = data.orders;
        const pagination = data.pagination;

        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">No orders found.</td></tr>';
            document.getElementById('pagination-info').innerText = 'Showing 0 orders';
            document.getElementById('pagination-controls').innerHTML = '';
            // Reset bulk actions state
            updateBulkActionsBar();
            return;
        }

        // Check if all orders on this page are selected to update the header checkbox
        let allPageOrdersSelected = true;

        orders.forEach(o => {
            const isChecked = selectedOrderIds.includes(o.id);
            if (!isChecked) allPageOrdersSelected = false;

            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group';
            tr.onclick = () => openOrderDetail(o.id);
            tr.innerHTML = `
                <td class="p-4 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" value="${o.id}" ${isChecked ? 'checked' : ''} onchange="handleOrderSelection(this)" class="order-select-checkbox rounded text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer">
                </td>
                <td class="p-4 font-bold text-pink-600 group-hover:underline">#${o.id}</td>
                <td class="p-4">
                    <p class="font-medium text-gray-800">${o.fullname}</p>
                    <p class="text-[10px] text-gray-400">${o.phone}</p>
                </td>
                <td class="p-4 font-medium text-gray-800">Rs. ${o.total_amount.toFixed(2)}</td>
                <td class="p-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${o.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${o.payment_status || 'Pending'}</span>
                </td>
                <td class="p-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getOrderStatusColor(o.status)}">${o.status}</span>
                </td>
                <td class="p-4 text-xs text-gray-400">${formatDateDDMMYYYY(o.created_at)}</td>
                <td class="p-4 text-right flex items-center justify-end gap-2" onclick="event.stopPropagation()">
                    <button onclick="openOrderDetail(${o.id})" class="text-pink-600 hover:text-pink-700 font-semibold text-xs transition-colors">View Details</button>
                    <span class="text-gray-350">|</span>
                    <button onclick="deleteSingleOrder(${o.id})" class="text-red-500 hover:text-red-700 font-semibold text-xs transition-colors">Delete</button>
                </td>`;
            tbody.appendChild(tr);
        });

        const selectAllCheckbox = document.getElementById('select-all-orders');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = allPageOrdersSelected && orders.length > 0;
        }

        updateBulkActionsBar();

        // Update Pagination Info
        const start = (pagination.currentPage - 1) * pagination.limit + 1;
        const end = Math.min(pagination.currentPage * pagination.limit, pagination.totalOrders);
        document.getElementById('pagination-info').innerText = `Showing ${start} to ${end} of ${pagination.totalOrders} orders`;

        // Update Pagination Controls
        renderPagination(pagination);

    } catch (err) {
        console.error('Error loading orders:', err);
    }
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';

    if (pagination.totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = `px-3 py-1 rounded border text-xs font-medium transition ${pagination.currentPage === 1 ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-100'}`;
    prevBtn.innerText = 'Previous';
    if (pagination.currentPage > 1) prevBtn.onclick = () => loadOrders(pagination.currentPage - 1);
    container.appendChild(prevBtn);

    // Page Numbers (Simplified)
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `w-8 h-8 rounded border text-xs font-medium transition ${pagination.currentPage === i ? 'bg-pink-500 text-white border-pink-500' : 'text-gray-600 border-gray-200 hover:bg-gray-100'}`;
            pageBtn.innerText = i;
            pageBtn.onclick = () => loadOrders(i);
            container.appendChild(pageBtn);
        } else if (i === pagination.currentPage - 2 || i === pagination.currentPage + 2) {
            const dots = document.createElement('span');
            dots.innerText = '...';
            dots.className = 'text-gray-400 px-1';
            container.appendChild(dots);
        }
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = `px-3 py-1 rounded border text-xs font-medium transition ${pagination.currentPage === pagination.totalPages ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-100'}`;
    nextBtn.innerText = 'Next';
    if (pagination.currentPage < pagination.totalPages) nextBtn.onclick = () => loadOrders(pagination.currentPage + 1);
    container.appendChild(nextBtn);
}

let currentOrderData = null;
let cachedSettings = null;

async function openOrderDetail(id) {
    try {
        // Start pre-fetching settings to avoid async delay during window.open
        const settingsPromise = cachedSettings ? Promise.resolve(cachedSettings) : fetch('/api/settings').then(r => r.json()).catch(() => null);

        const res = await fetch('/api/admin/orders/' + id);
        if (!res.ok) throw new Error('Order not found');
        const data = await res.json();
        currentOrderData = data; // Store for invoice printing
        const order = data.order;

        // Resolve and cache settings
        const settings = await settingsPromise;
        if (settings) {
            cachedSettings = settings;
        }
        const items = data.items;
        const tracking = data.tracking;

        // Header
        document.getElementById('detail-order-id').innerText = '#' + order.id;
        document.getElementById('detail-order-date').innerText = new Date(order.created_at).toLocaleString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
        }) + ' from Online Store';

        // Invoice Sent Status
        const invoiceSentEl = document.getElementById('detail-invoice-sent');
        if (order.invoice_sent_at) {
            invoiceSentEl.innerText = 'Invoice sent on ' + new Date(order.invoice_sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            invoiceSentEl.classList.remove('hidden');
        } else {
            invoiceSentEl.classList.add('hidden');
        }

        // Status Badge (Main)
        const statusBadge = document.getElementById('detail-status-badge');
        if (statusBadge) {
            statusBadge.innerText = order.status;
            statusBadge.className = 'status-badge ' + getOrderStatusColor(order.status);
        }

        // Payment Badge
        const paymentBadge = document.getElementById('detail-payment-badge');
        paymentBadge.innerText = order.payment_status || 'Payment pending';
        paymentBadge.className = 'status-badge ' + (order.payment_status === 'Paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200');

        // Fulfillment Badge
        const fulfillmentBadge = document.getElementById('detail-fulfillment-badge');
        const isFulfilled = (order.status === 'Delivered');
        fulfillmentBadge.innerText = isFulfilled ? 'Fulfilled' : (order.status === 'Cancelled' ? 'Cancelled' : 'Unfulfilled');
        fulfillmentBadge.className = 'status-badge ' + (isFulfilled ? 'bg-green-100 text-green-700 border border-green-200' : (order.status === 'Cancelled' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'));

        // Fulfillment Card
        document.getElementById('fulfillment-card-title').innerText = (isFulfilled ? 'Fulfilled' : 'Items') + ' (' + items.length + ')';
        const itemsList = document.getElementById('detail-items-list');
        itemsList.innerHTML = items.map(item => `<div class="flex items-center justify-between"><div class="flex items-center gap-3"><img src="${item.image || '/assets/images/placeholder.png'}" class="w-12 h-12 rounded border border-gray-100 object-cover"><div><p class="text-sm font-medium text-blue-600 hover:underline cursor-pointer">${item.name}</p><p class="text-[11px] text-gray-400">SKU: Sewing-${order.id}-${item.id} / Standard</p></div></div><div class="text-sm text-right"><p class="font-medium text-gray-800">Rs. ${(item.price * item.quantity).toFixed(2)}</p><p class="text-[10px] text-gray-400">Rs. ${parseFloat(item.price).toFixed(2)} × ${item.quantity}</p></div></div>`).join('');

        // Amazon-style Tracking Update
        updateTrackingUI(order.status);



        // Smart Action Buttons
        renderSmartActionButtons(order);

        // Status Stepper
        const stepper = document.getElementById('order-status-stepper');
        stepper.value = order.status;
        
        // Payment Summary
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        document.getElementById('detail-subtotal-label').innerText = 'Subtotal (' + items.length + ' item' + (items.length !== 1 ? 's' : '') + ')';
        document.getElementById('detail-subtotal-value').innerText = 'Rs. ' + subtotal.toFixed(2);
        document.getElementById('detail-shipping-value').innerText = 'Rs. ' + parseFloat(order.delivery_charge || 0).toFixed(2);
        document.getElementById('detail-total-value').innerText = 'Rs. ' + parseFloat(order.total_amount).toFixed(2);
        
        const isPaid = order.payment_status === 'Paid';
        document.getElementById('detail-paid-value').innerText = 'Rs. ' + (isPaid ? parseFloat(order.total_amount).toFixed(2) : '0.00');
        document.getElementById('detail-balance-value').innerText = 'Rs. ' + (isPaid ? '0.00' : parseFloat(order.total_amount).toFixed(2));
        document.getElementById('detail-payment-status-text').innerText = isPaid ? 'Paid' : 'Payment pending';
        
        const markAsPaidBtn = document.getElementById('mark-as-paid-btn');
        if (markAsPaidBtn) {
            if (isPaid) markAsPaidBtn.classList.add('hidden');
            else markAsPaidBtn.classList.remove('hidden');
        }

        // Sidebar (Customer Info)
        const nameEl = document.getElementById('sidebar-customer-name');
        if (nameEl) nameEl.innerText = order.fullname;
        
        const emailEl = document.getElementById('sidebar-customer-email');
        if (emailEl) emailEl.innerText = order.email || 'No email provided';
        
        const phoneEl = document.getElementById('sidebar-customer-phone');
        if (phoneEl) phoneEl.innerText = order.phone;
        
        // Insights
        const payPrefEl = document.getElementById('insight-payment-pref');
        if (payPrefEl) payPrefEl.innerText = `Preferred Method: ${order.payment_method}`;
        
        const locationParts = (order.address || '').split(',');
        const city = locationParts[locationParts.length - 1]?.trim() || 'India';
        const locEl = document.getElementById('insight-location');
        if (locEl) locEl.innerText = `Based in ${city}`;

        const addrLines = (order.address || '').split(',').map(l => l.trim());
        const shippingAddrEl = document.getElementById('sidebar-shipping-address');
        if (shippingAddrEl) shippingAddrEl.innerHTML = `<strong>${order.fullname}</strong><br>` + addrLines.join('<br>');

        // Map Link
        const mapLink = document.getElementById('view-map-link');
        if (mapLink) {
            mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address || '')}`;
            mapLink.target = '_blank';
        }

        // Fetch customer order count
        fetchCustomerStats(order.user_id, order.phone);

        const timelineHistory = document.getElementById('detail-timeline-history');
        if (timelineHistory) {
            // Filter out redundant Delivered entries or multiple similar status changes
            let lastStatus = '';
            const filteredTracking = (tracking || []).filter(t => {
                if (t.status === lastStatus && t.status !== 'Note') return false;
                lastStatus = t.status;
                return true;
            });

            timelineHistory.innerHTML = filteredTracking.map(t => `
                <div class="relative pb-6 last:pb-0">
                    <div class="absolute -left-[26px] mt-1 w-2.5 h-2.5 rounded-full ${t.status === 'Cancelled' ? 'bg-red-400' : (t.status === 'Note' ? 'bg-gray-400' : 'bg-pink-400')} border-2 border-white shadow-sm"></div>
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-semibold text-gray-700">${t.status === 'Note' ? 'Admin Note' : t.status}</p>
                            ${t.note ? `<p class="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded border border-gray-100">${t.note}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 font-medium uppercase">${new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p class="text-[9px] text-gray-300 font-medium">${formatDateDDMMYYYY(t.updated_at)}</p>
                        </div>
                    </div>
                </div>`).reverse().join(''); 
        }

        // Update Comment Box Placeholder Avatar
        const avatar = document.querySelector('.bg-pink-100.text-pink-600.font-bold') || document.querySelector('.bg-green-500.text-white.font-bold');
        if (avatar) avatar.innerText = (order.fullname || 'A')[0].toUpperCase();

        // Ensure modal is visible
        const modal = document.getElementById('orderDetailModal');
        if (modal) modal.classList.remove('hidden');
    } catch (err) {
        console.error("Error in openOrderDetail:", err);
        alert('Could not load order details: ' + err.message);
    }
}

function updateTrackingUI(status) {
    const steps = {
        'Order Placed': { width: '0%', active: ['placed'] },
        'Processing': { width: '25%', active: ['placed', 'processing'] },
        'Shipped': { width: '50%', active: ['placed', 'processing', 'shipped'] },
        'Out for Delivery': { width: '75%', active: ['placed', 'processing', 'shipped', 'delivery'] },
        'Delivered': { width: '100%', active: ['placed', 'processing', 'shipped', 'delivery', 'delivered'] },
        'Cancelled': { width: '0%', active: [] }
    };

    const config = steps[status] || steps['Order Placed'];
    const bar = document.getElementById('tracking-progress-bar');
    if (bar) bar.style.width = config.width;
    
    document.getElementById('tracking-status-text').innerText = status;
    if (status === 'Cancelled') document.getElementById('tracking-status-text').className = 'text-xs font-bold text-red-600 uppercase tracking-widest';

    const allSteps = ['placed', 'processing', 'shipped', 'delivery', 'delivered'];
    allSteps.forEach(s => {
        const el = document.getElementById('step-' + s);
        if (el) {
            if (config.active.includes(s)) {
                el.className = 'w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center border-4 border-white shadow-sm transition-all duration-500 scale-110';
            } else {
                el.className = 'w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center border-4 border-white shadow-sm transition-all duration-500';
            }
        }
    });
}

function renderSmartActionButtons(order) {
    const container = document.getElementById('status-action-buttons');
    if (!container) return;
    container.innerHTML = '';

    const validTransitions = {
        'Order Placed': { next: 'Processing', label: 'Start Processing', color: 'bg-blue-600' },
        'Processing': { next: 'Shipped', label: 'Mark as Shipped', color: 'bg-indigo-600' },
        'Shipped': { next: 'Out for Delivery', label: 'Out for Delivery', color: 'bg-purple-600' },
        'Out for Delivery': { next: 'Delivered', label: 'Confirm Delivery', color: 'bg-green-600' }
    };

    const config = validTransitions[order.status];
    if (config) {
        const btn = document.createElement('button');
        btn.className = `${config.color} text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-sm hover:opacity-90 transition`;
        btn.innerText = config.label;
        btn.onclick = (e) => {
            e.stopPropagation();
            updateOrderStatus(config.next);
        };
        container.appendChild(btn);
    }

    if (order.status !== 'Delivered' && order.status !== 'Cancelled') {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = `bg-white border border-red-200 text-red-500 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-red-50 transition`;
        cancelBtn.innerText = 'Cancel Order';
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            updateOrderStatus('Cancelled');
        };
        container.appendChild(cancelBtn);
    }
}


async function deleteCurrentOrder() {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!orderId || orderId === '0') return;

    if (!confirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone and will permanently remove all order information, items, and tracking details.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showToast(`Order #${orderId} deleted successfully.`);
            toggleModal('orderDetailModal'); // Close modal
            loadOrders(currentOrdersPage);   // Reload order list
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete order.');
        }
    } catch (err) {
        console.error('Error deleting order:', err);
        alert('Error deleting order: ' + err.message);
    }
}

async function sendInvoiceEmail() {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    const btn = document.getElementById('btn-send-invoice');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 text-pink-600" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...';

    try {
        const res = await fetch(`/api/admin/orders/${orderId}/send-invoice`, { method: 'POST' });
        if (res.ok) {
            showToast('Invoice sent to customer email! 📧');
            openOrderDetail(orderId); // Refresh to show sent date
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to send invoice.');
        }
    } catch (err) {
        console.error(err);
        alert('Error sending invoice.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function toggleWhatsAppDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('whatsapp-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
}

// Close WhatsApp dropdown when clicking outside
window.addEventListener('click', (e) => {
    const menu = document.getElementById('whatsapp-dropdown-menu');
    if (menu && !e.target.closest('#btn-send-whatsapp')) {
        menu.classList.add('hidden');
    }
});

function sendWhatsAppAlert(alertType) {
    if (!currentOrderData || !currentOrderData.order) {
        alert('No order data loaded.');
        return;
    }
    
    // Hide dropdown menu
    const menu = document.getElementById('whatsapp-dropdown-menu');
    if (menu) menu.classList.add('hidden');
    
    const { order } = currentOrderData;
    const settings = cachedSettings || {};
    
    let template = '';
    if (alertType === 'shipped') {
        template = settings.whatsapp_template_shipped || 'Hello {name},\n\nYour order #{order_id} from {store_name} has been shipped! 🚀\nCourier: {courier}\nTracking No: {tracking_number}\n\nTrack here: {tracking_url}';
    } else if (alertType === 'delivered') {
        template = settings.whatsapp_template_delivered || 'Hello {name},\n\nYour order #{order_id} from {store_name} has been delivered successfully! 🎉\n\nYou can view details and download the invoice here: {tracking_url}\n\nThank you for shopping with us! 🌸';
    } else {
        template = settings.whatsapp_template_placed || 'Hello {name},\n\nThank you for shopping at {store_name}! 🌸\n\nYour Order #{order_id} has been placed successfully.\nTotal Amount: Rs. {total_amount}\nPayment Method: {payment_method}\n\nTrack your order here: {tracking_url}';
    }
    
    // Format phone number
    let phone = (order.phone || '').trim().replace(/\D/g, '');
    if (phone.length === 10) {
        phone = '91' + phone;
    }
    
    // Use the configured store URL from settings, or fallback to the current domain
    const storeUrl = settings.store_url || window.location.origin;
    const trackingUrl = `${storeUrl}/track-order.html?phone=${order.phone}&order_id=${order.id}`;
    const customerName = order.fullname || `${order.first_name} ${order.last_name}`;
    
    const message = template
        .replace(/{name}/g, customerName)
        .replace(/{order_id}/g, order.id)
        .replace(/{total_amount}/g, order.total_amount)
        .replace(/{payment_method}/g, order.payment_method || 'COD')
        .replace(/{tracking_url}/g, trackingUrl)
        .replace(/{courier}/g, order.courier_name || '')
        .replace(/{tracking_number}/g, order.tracking_number || '')
        .replace(/{store_name}/g, settings.store_name || 'Devangi Products');
        
    // Open WhatsApp Web or App (fully synchronous to prevent popup blockers)
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
}

function prepareInvoicePrint() {
    if (!currentOrderData) return;
    const { order, items } = currentOrderData;
    
    document.getElementById('print-order-id').innerText = order.id;
    document.getElementById('print-customer-name').innerText = order.fullname;
    document.getElementById('print-customer-address').innerText = order.address;
    document.getElementById('print-customer-email').innerText = order.email || '-';
    document.getElementById('print-customer-phone').innerText = order.phone;
    document.getElementById('print-order-date').innerText = formatDateDDMMYYYY(order.created_at);
    document.getElementById('print-payment-method').innerText = order.payment_method;
    document.getElementById('print-payment-status').innerText = order.payment_status;
    
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    document.getElementById('print-subtotal').innerText = 'Rs. ' + subtotal.toFixed(2);
    document.getElementById('print-shipping').innerText = 'Rs. ' + parseFloat(order.delivery_charge || 0).toFixed(2);
    document.getElementById('print-total').innerText = 'Rs. ' + parseFloat(order.total_amount).toFixed(2);
    
    const itemsTbody = document.getElementById('print-items-list');
    itemsTbody.innerHTML = items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');
}

function printInvoice() {
    prepareInvoicePrint();
    const printArea = document.getElementById('invoice-print-area');
    const originalContent = document.body.innerHTML;
    
    const order = currentOrderData.order;
    const name = (order.fullname || `${order.first_name || ''} ${order.last_name || ''}`).trim() || 'Customer';
    const phoneSuffix = order.phone ? ` ${order.phone}` : '';
    const docTitle = `${name} Order #${order.id}${phoneSuffix}`.trim();

    // Create a new window for printing to avoid messing up the main UI
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${docTitle}</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background: #fff; }
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .invoice-page {
                            width: 210mm;
                            height: 297mm;
                            padding: 20mm;
                            box-sizing: border-box;
                            background: #fff;
                            display: flex;
                            flex-direction: column;
                        }
                        .invoice-page > div {
                            display: flex;
                            flex-direction: column;
                            flex: 1;
                            height: 100%;
                        }
                        .invoice-page > div > div:last-child {
                            margin-top: auto !important;
                        }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-page">
                    ${printArea.innerHTML}
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

async function downloadInvoice() {
    prepareInvoicePrint();
    const printArea = document.getElementById('invoice-print-area');
    printArea.classList.remove('hidden'); // Temporarily show to capture
    
    const { jsPDF } = window.jspdf;
    
    try {
        const canvas = await html2canvas(printArea, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        const order = currentOrderData.order;
        const name = (order.fullname || `${order.first_name || ''} ${order.last_name || ''}`).trim() || 'Customer';
        const phoneSuffix = order.phone ? ` ${order.phone}` : '';
        const docTitle = `${name} Order #${order.id}${phoneSuffix}`.trim();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${docTitle}.pdf`);
        showToast('Invoice PDF downloaded! 📥');
    } catch (err) {
        console.error(err);
        alert('Error generating PDF.');
    } finally {
        printArea.classList.add('hidden');
    }
}


// ===== COURIER LABEL — Sample Style, 4-per-A4 Print =====
async function downloadCourierLabel() {
    // backward compat — just call the new function
    printCourierLabel4up();
}

async function printCourierLabel4up() {
    if (!currentOrderData) { alert('Please open an order first.'); return; }
    const { order, items } = currentOrderData;

    const labelHTML = generateSingleLabelHTML(order, items);
    const thankYouHTML = generateThankYouCardHTML(order);

    const customerName = (order.fullname || `${order.first_name || ''} ${order.last_name || ''}`).trim() || 'Customer';
    const phoneSuffix = order.phone ? ` ${order.phone}` : '';
    const docTitle = `${customerName} Order #${order.id}${phoneSuffix}`.trim();

    // ── Open print window — 1 label top-left, 1 thank you bottom-left, 2 empty cells
    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
        alert('Popup blocked! Please allow popups for this site and try again.');
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${docTitle}</title>
    <!-- Load Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; font-family:Arial,Helvetica,sans-serif; }

        @page { size: A4 portrait; margin: 6mm; }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 6mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 0;
            position: relative;
        }

        .label-cell {
            padding: 5mm;
            position: relative;
        }

        /* Cut lines */
        .cut-h {
            position: absolute; left:0; right:0; top:50%;
            border-top: 1px dashed #ccc; z-index:10;
        }
        .cut-v {
            position: absolute; top:0; bottom:0; left:50%;
            border-left: 1px dashed #ccc; z-index:10;
        }
        .scissor-h {
            position:absolute; top:50%; left:4px;
            transform:translateY(-50%);
            font-size:13px; color:#bbb; z-index:11;
        }
        .scissor-v {
            position:absolute; left:50%; top:4px;
            transform:translateX(-50%);
            font-size:13px; color:#bbb; z-index:11;
        }

        @media print {
            body { margin:0; }
            .no-print { display:none !important; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position:fixed;top:10px;right:10px;z-index:100;display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#be185d;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ Print</button>
        <button onclick="window.close()" style="background:#e5e7eb;color:#333;border:none;padding:10px 16px;border-radius:6px;font-size:14px;cursor:pointer;">✕ Close</button>
    </div>

    <div class="page">
        <!-- cut marks -->
        <div class="cut-h"></div>
        <div class="cut-v"></div>
        <div class="scissor-h">✂</div>
        <div class="scissor-v">✂</div>

        <!-- TOP-LEFT: Real label -->
        <div class="label-cell">${labelHTML}</div>

        <!-- TOP-RIGHT: Empty -->
        <div class="label-cell"></div>

        <!-- BOTTOM-LEFT: Thank You card -->
        <div class="label-cell">${thankYouHTML}</div>

        <!-- BOTTOM-RIGHT: Empty -->
        <div class="label-cell"></div>
    </div>
</body>
</html>`);

    printWindow.document.close();
    showToast('Label & Thank You Card ready! 🏷️ Click Print in the popup window.');
}


async function fetchCustomerStats(userId, phone) {
    try {
        const res = await fetch(`/api/admin/customers/stats?phone=${phone}`);
        const stats = await res.json();
        
        const countEl = document.getElementById('sidebar-order-count');
        if (countEl) countEl.innerText = stats.order_count + (stats.order_count === 1 ? ' order' : ' orders');
        
        const statusEl = document.getElementById('insight-order-status');
        if (statusEl) statusEl.innerText = stats.order_count === 1 ? 'First-time customer' : 'Repeat customer';
        
        const historyEl = document.getElementById('insight-order-history');
        if (historyEl) historyEl.innerText = `Total orders: ${stats.order_count}`;
        
    } catch (err) {
        console.error('Stats fetch error:', err);
    }
}

async function addTimelineComment() {
    const noteEl = document.getElementById('timeline-comment');
    const note = noteEl.value;
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!note.trim()) return;

    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Internal Note', note: note })
        });
        if (res.ok) {
            noteEl.value = '';
            openOrderDetail(orderId); 
            showToast('Comment posted! 💬');
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateOrderStatus(newStatus) {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    const currentStatus = currentOrderData.order.status;
    
    // Status Flow Validation
    const statusOrder = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    
    if (newStatus !== 'Cancelled' && currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex) {
        if (!confirm(`Warning: You are moving the status backwards from "${currentStatus}" to "${newStatus}". Continue?`)) {
            document.getElementById('order-status-stepper').value = currentStatus;
            return;
        }
    }

    if (!confirm('Change order status to ' + newStatus + '?')) {
        document.getElementById('order-status-stepper').value = currentStatus;
        return;
    }

    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, note: 'Status updated manually by admin.' })
        });
        if (res.ok) {
            showToast('Status updated to ' + newStatus + '! ✅');
            // Small delay to ensure DB is updated before refreshing
            setTimeout(() => {
                openOrderDetail(orderId);
                loadOrders(currentOrdersPage);
            }, 500);
        } else {
            const errData = await res.json();
            alert('Error updating status: ' + (errData.error || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
        alert('Critical error: ' + err.message);
    }
}

async function updatePaymentStatus(newStatus) {
    const orderId = document.getElementById('detail-order-id').innerText.replace('#', '');
    if (!confirm('Mark as ' + newStatus + '?')) return;
    try {
        const res = await fetch('/api/admin/orders/' + orderId + '/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, note: 'Payment status updated manually.' })
        });
        if (res.ok) {
            showToast('Payment marked as ' + newStatus + '! 💰');
            openOrderDetail(orderId);
            loadOrders(currentOrdersPage);
        }
    } catch (err) {
        console.error(err);
    }
}

function getOrderStatusColor(status) {
    const colors = {
        'Order Placed': 'bg-pink-100 text-pink-700 border border-pink-200',
        'Processing': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        'Shipped': 'bg-blue-100 text-blue-700 border border-blue-200',
        'Delivered': 'bg-green-100 text-green-700 border border-green-200',
        'Cancelled': 'bg-red-100 text-red-700 border border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
}

document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll("#admin-sidebar a");
    sidebarLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href && href !== "/" && currentPath.includes(href)) {
            // Remove inactive classes
            link.classList.remove("text-gray-600", "hover:bg-gray-50", "hover:text-gray-900");
            // Add active classes
            link.classList.add("bg-pink-50", "text-pink-700");
            
            // Also change svg icon color
            const svg = link.querySelector("svg");
            if (svg) {
                svg.classList.remove("text-gray-400", "group-hover:text-gray-500");
                svg.classList.add("text-pink-500");
            }
        } else if (href === "index.html" && currentPath.endsWith("/admin/")) {
            // Special case for root /admin/ pointing to index.html
            link.classList.remove("text-gray-600", "hover:bg-gray-50", "hover:text-gray-900");
            link.classList.add("bg-pink-50", "text-pink-700");
            const svg = link.querySelector("svg");
            if (svg) {
                svg.classList.remove("text-gray-400", "group-hover:text-gray-500");
                svg.classList.add("text-pink-500");
            }
        }
    });
});

// ===== Notification Badge =====
async function updateNotificationBadge() {
    try {
        const res = await fetch('/api/admin/notifications/count');
        if (!res.ok) return;
        const data = await res.json();
        
        // Update sidebar order badge
        const badge = document.getElementById('sidebar-order-badge');
        if (badge) {
            badge.textContent = data.pending_orders || 0;
            badge.style.display = (data.pending_orders > 0) ? '' : 'none';
        }
        
        // Update pending count on dashboard
        const pendingEl = document.getElementById('pending-orders-count');
        if (pendingEl) pendingEl.textContent = data.pending_orders || 0;
    } catch (err) { /* silent */ }
}

// ===== Export Orders CSV =====
function exportOrdersCSV() {
    const statusEl = document.getElementById('order-status-filter');
    const startEl = document.getElementById('order-start-date');
    const endEl = document.getElementById('order-end-date');
    const monthEl = document.getElementById('order-month-filter');
    const yearEl = document.getElementById('order-year-filter');
    
    let params = new URLSearchParams();
    if (statusEl && statusEl.value) params.set('status', statusEl.value);
    if (startEl && startEl.value) params.set('startDate', startEl.value);
    if (endEl && endEl.value) params.set('endDate', endEl.value);
    if (monthEl && monthEl.value) params.set('month', monthEl.value);
    if (yearEl && yearEl.value) params.set('year', yearEl.value);
    
    window.open('/api/admin/orders/export/csv?' + params.toString(), '_blank');
    showToast('Exporting orders to CSV... 📊');
}

// ===== WhatsApp Notify =====
async function sendWhatsAppNotify(orderId) {
    try {
        const res = await fetch(`/api/admin/whatsapp-notify/${orderId}`);
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
    } catch (err) { console.error(err); }
}

// ===== WhatsApp Tracking Link for Customer (Option B) =====
function sendWhatsAppTrackingLink() {
    if (!currentOrderData || !currentOrderData.order) {
        showToast('❌ No order data loaded.');
        return;
    }
    const order = currentOrderData.order;
    const trackingUrl = `${window.location.origin}/track-order.html?phone=${order.phone}&order_id=${order.id}`;
    const message = `Hello ${order.fullname},\n\nThank you for shopping at Devangi Products! 🌸\n\nYou can track the status of your Order #${order.id} here: ${trackingUrl}\n\nHave a great day!`;
    const whatsappUrl = `https://wa.me/91${order.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast('WhatsApp tracking message composed! 📱');
}

// ===== Admin Logout =====
function adminLogout() {
    fetch('/api/admin/logout', { method: 'POST' }).then(() => {
        window.location.href = '/admin/login.html';
    });
}

let adminShippingSettings = {
    chargeGujarat: 50,
    chargeMaharashtra: 60,
    chargeOthers: 100,
    shippingFreeAbove: 250
};

async function loadAdminShippingSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            adminShippingSettings.chargeGujarat = parseFloat(settings.shipping_charge_gujarat) || 50;
            adminShippingSettings.chargeMaharashtra = parseFloat(settings.shipping_charge_maharashtra) || 60;
            adminShippingSettings.chargeOthers = parseFloat(settings.shipping_charge_others) || 100;
            adminShippingSettings.shippingFreeAbove = parseFloat(settings.shipping_free_above) || 250;
        }
    } catch (err) {
        console.error('Error loading shipping settings for admin:', err);
    }
}

function calculateAdminShipping(pincode, subtotal) {
    if (!pincode || pincode.length < 2) {
        return adminShippingSettings.chargeOthers; // fallback
    }
    const prefix2 = pincode.substring(0, 2);
    const prefix3 = pincode.substring(0, 3);
    
    let currentShipping = adminShippingSettings.chargeOthers;
    if (prefix2 === '36' || prefix2 === '37' || prefix2 === '38' || prefix2 === '39') {
        currentShipping = adminShippingSettings.chargeGujarat;
    } else if ((prefix2 === '40' || prefix2 === '41' || prefix2 === '42' || prefix2 === '43' || prefix2 === '44') && prefix3 !== '403') {
        currentShipping = adminShippingSettings.chargeMaharashtra;
    }
    
    return subtotal >= adminShippingSettings.shippingFreeAbove ? 0 : currentShipping;
}

function recalculateManualOrderShipping() {
    const pincode = document.getElementById('mo_pincode').value.trim();
    const subtotal = manualOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isPincodeValid = /^[1-9][0-9]{5}$/.test(pincode);
    
    // Toggle error visibility only if they entered 6 or more characters
    const errEl = document.getElementById('mo_pincode_error');
    if (errEl) {
        errEl.style.display = (pincode && pincode.length >= 6 && !isPincodeValid) ? 'block' : 'none';
    }
    
    if (pincode && pincode.length >= 2) {
        const charge = calculateAdminShipping(pincode, subtotal);
        document.getElementById('mo_delivery_charge').value = charge;
    }
}

function recalculateEditOrderShipping() {
    const pincode = document.getElementById('eo_pincode').value.trim();
    const subtotal = editOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isPincodeValid = /^[1-9][0-9]{5}$/.test(pincode);
    
    // Toggle error visibility only if they entered 6 or more characters
    const errEl = document.getElementById('eo_pincode_error');
    if (errEl) {
        errEl.style.display = (pincode && pincode.length >= 6 && !isPincodeValid) ? 'block' : 'none';
    }
    
    if (pincode && pincode.length >= 2) {
        const charge = calculateAdminShipping(pincode, subtotal);
        document.getElementById('eo_delivery_charge').value = charge;
    }
}

function validateAdminPhone(id, errorId) {
    const val = document.getElementById(id).value.trim();
    const isValid = /^[0-9]{10}$/.test(val);
    const errEl = document.getElementById(errorId);
    if (errEl) {
        errEl.style.display = (val && !isValid) ? 'block' : 'none';
    }
}

function getStateFromPincode(pincode) {
    if (!pincode || pincode.length < 2) return '';
    const prefix2 = pincode.substring(0, 2);
    const prefix3 = pincode.substring(0, 3);
    
    if (prefix3 === '403') return 'Goa';
    if (prefix3 === '160') return 'Chandigarh';
    if (prefix3 === '605') return 'Puducherry';
    if (prefix3 === '737') return 'Sikkim';
    if (prefix3 === '744') return 'Andaman & Nicobar Islands';
    
    if (prefix3 === '248' || prefix3 === '249' || prefix3 === '263') return 'Uttarakhand';
    
    if (['814', '815', '816', '822', '825', '826', '827', '828', '829', '831', '832', '833', '834', '835'].includes(prefix3)) {
        return 'Jharkhand';
    }
    
    if (prefix2 === '79') {
        if (prefix3 === '790' || prefix3 === '791' || prefix3 === '792') return 'Arunachal Pradesh';
        if (prefix3 === '793' || prefix3 === '794') return 'Meghalaya';
        if (prefix3 === '795') return 'Manipur';
        if (prefix3 === '796') return 'Mizoram';
        if (prefix3 === '797' || prefix3 === '798') return 'Nagaland';
        if (prefix3 === '799') return 'Tripura';
        return 'Northeast State';
    }

    const stateMap = {
        '11': 'Delhi',
        '12': 'Haryana', '13': 'Haryana',
        '14': 'Punjab', '15': 'Punjab',
        '17': 'Himachal Pradesh',
        '18': 'Jammu and Kashmir', '19': 'Jammu and Kashmir',
        '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Uttar Pradesh', '24': 'Uttar Pradesh', '25': 'Uttar Pradesh', '26': 'Uttar Pradesh', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
        '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan', '33': 'Rajasthan', '34': 'Rajasthan',
        '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat', '39': 'Gujarat',
        '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra',
        '45': 'Madhya Pradesh', '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh',
        '49': 'Chhattisgarh',
        '50': 'Telangana',
        '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
        '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
        '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
        '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
        '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal', '73': 'West Bengal', '74': 'West Bengal',
        '75': 'Odisha', '76': 'Odisha', '77': 'Odisha',
        '78': 'Assam',
        '80': 'Bihar', '81': 'Bihar', '82': 'Bihar', '83': 'Bihar', '84': 'Bihar', '85': 'Bihar'
    };

    return stateMap[prefix2] || '';
}

// ===== Add Manual Order Flow =====
let manualOrderItems = [];
let allProducts = [];

async function initAddOrderModal() {
    try {
        // Reset form inputs
        document.getElementById('mo_first_name').value = '';
        document.getElementById('mo_last_name').value = '';
        document.getElementById('mo_phone').value = '';
        document.getElementById('mo_email').value = '';
        document.getElementById('mo_house_no').value = '';
        document.getElementById('mo_society').value = '';
        document.getElementById('mo_street').value = '';
        document.getElementById('mo_landmark').value = '';
        document.getElementById('mo_city').value = '';
        document.getElementById('mo_state').value = '';
        document.getElementById('mo_pincode').value = '';
        
        document.getElementById('mo_product_qty').value = 1;
        document.getElementById('mo_delivery_charge').value = 0;
        if (document.getElementById('mo_pincode_error')) document.getElementById('mo_pincode_error').style.display = 'none';
        if (document.getElementById('mo_phone_error')) document.getElementById('mo_phone_error').style.display = 'none';
        
        document.getElementById('mo_payment_method').value = 'COD';
        document.getElementById('mo_payment_status').value = 'Pending';
        
        manualOrderItems = [];
        allProducts = [];
        
        renderManualOrderItems();
        updateManualOrderSummary();
        
        // Fetch products
        const select = document.getElementById('mo_product_select');
        select.innerHTML = '<option value="">-- Loading products... --</option>';
        
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        allProducts = await res.json();
        
        select.innerHTML = '<option value="">-- Select Product --</option>';
        allProducts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.title} - Rs. ${p.price}`;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error opening manual order modal:', error);
        showToast('Error loading products. Please try again.');
    }
}

function addManualOrderItem() {
    const select = document.getElementById('mo_product_select');
    const qtyInput = document.getElementById('mo_product_qty');
    
    const productId = select.value;
    const qty = parseInt(qtyInput.value) || 1;
    
    if (!productId) {
        alert('Please select a product first.');
        return;
    }
    
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;
    
    const existingIndex = manualOrderItems.findIndex(item => item.id == productId);
    if (existingIndex > -1) {
        manualOrderItems[existingIndex].quantity += qty;
    } else {
        const image = (product.images && product.images[0]) || product.image || '';
        manualOrderItems.push({
            id: product.id,
            name: product.title,
            price: product.price,
            quantity: qty,
            image: image
        });
    }
    
    // Reset selection inputs
    select.value = '';
    qtyInput.value = 1;
    
    renderManualOrderItems();
    recalculateManualOrderShipping();
    updateManualOrderSummary();
    showToast('Product added to order! 🛍️');
}

function removeManualOrderItem(index) {
    manualOrderItems.splice(index, 1);
    renderManualOrderItems();
    recalculateManualOrderShipping();
    updateManualOrderSummary();
}

function renderManualOrderItems() {
    const tbody = document.getElementById('mo_items_tbody');
    tbody.innerHTML = '';
    
    if (manualOrderItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-4 text-center text-gray-400 italic">No products added yet.</td>
            </tr>
        `;
        return;
    }
    
    manualOrderItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100 hover:bg-gray-50';
        tr.innerHTML = `
            <td class="p-2 text-gray-700">${item.name}</td>
            <td class="p-2 text-center text-gray-800 font-medium">${item.quantity}</td>
            <td class="p-2 text-right text-gray-600">Rs. ${item.price.toFixed(2)}</td>
            <td class="p-2 text-right text-gray-900 font-medium">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
            <td class="p-2 text-center">
                <button type="button" onclick="removeManualOrderItem(${index})" class="text-red-500 hover:text-red-700 font-bold">
                    ✕
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateManualOrderSummary() {
    const subtotal = manualOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCharge = parseFloat(document.getElementById('mo_delivery_charge').value) || 0;
    const grandTotal = subtotal + deliveryCharge;
    
    document.getElementById('mo_subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('mo_grand_total').textContent = grandTotal.toFixed(2);
}

async function submitManualOrder(event) {
    event.preventDefault();
    
    if (manualOrderItems.length === 0) {
        alert('Please add at least one product to the order.');
        return;
    }
    
    const first_name = document.getElementById('mo_first_name').value.trim();
    const last_name = document.getElementById('mo_last_name').value.trim();
    const phone = document.getElementById('mo_phone').value.trim();
    const email = document.getElementById('mo_email').value.trim() || '';
    
    validateAdminPhone('mo_phone', 'mo_phone_error');
    recalculateManualOrderShipping();
    
    if (!/^[0-9]{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit Phone Number.');
        return;
    }
    
    const house_no = document.getElementById('mo_house_no').value.trim();
    const society = document.getElementById('mo_society').value.trim();
    const street = document.getElementById('mo_street').value.trim();
    const landmark = document.getElementById('mo_landmark').value.trim() || '';
    const city = document.getElementById('mo_city').value.trim();
    const state = document.getElementById('mo_state').value.trim();
    const pincode = document.getElementById('mo_pincode').value.trim();
    
    const fullAddress = `${house_no}, ${society}, ${street}, ${landmark ? landmark + ', ' : ''}${city}, ${state} - ${pincode}`;
    const delivery_charge = parseFloat(document.getElementById('mo_delivery_charge').value) || 0;
    const subtotal = parseFloat(document.getElementById('mo_subtotal').textContent);
    const total_amount = subtotal + delivery_charge;
    
    const payment_method = document.getElementById('mo_payment_method').value;
    const payment_status = document.getElementById('mo_payment_status').value;
    
    const payload = {
        first_name,
        last_name,
        fullname: `${first_name} ${last_name}`,
        email,
        phone,
        house_no,
        society,
        street,
        landmark,
        city,
        state,
        pincode,
        address: fullAddress,
        items: manualOrderItems,
        delivery_charge,
        total_amount,
        payment_method,
        payment_status,
        label: 'Home'
    };
    
    try {
        const btn = event.submitter || document.querySelector('#addOrderForm button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating...';
        }
        
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Failed to create order');
        const data = await res.json();
        
        showToast('Manual order created successfully! 📦✨');
        toggleModal('addOrderModal');
        
        // Refresh orders list
        if (typeof loadOrders === 'function') {
            loadOrders();
        }
        if (typeof updateNotificationBadge === 'function') {
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error creating manual order:', error);
        alert('Failed to create order. Please try again.');
    }
}

// ===== Bulk Order Selection & Actions Flow =====
let selectedOrderIds = [];

function handleOrderSelection(checkbox) {
    const id = parseInt(checkbox.value);
    if (checkbox.checked) {
        if (!selectedOrderIds.includes(id)) {
            selectedOrderIds.push(id);
        }
    } else {
        selectedOrderIds = selectedOrderIds.filter(selectedId => selectedId !== id);
    }
    
    // Check if we need to update the "select all" checkbox
    const selectAllCheckbox = document.getElementById('select-all-orders');
    const checkboxes = document.querySelectorAll('.order-select-checkbox');
    if (selectAllCheckbox && checkboxes.length > 0) {
        let allChecked = true;
        checkboxes.forEach(cb => {
            if (!cb.checked) allChecked = false;
        });
        selectAllCheckbox.checked = allChecked;
    }
    
    updateBulkActionsBar();
}

function toggleSelectAllOrders(headerCheckbox) {
    const checkboxes = document.querySelectorAll('.order-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = headerCheckbox.checked;
        const id = parseInt(cb.value);
        if (headerCheckbox.checked) {
            if (!selectedOrderIds.includes(id)) {
                selectedOrderIds.push(id);
            }
        } else {
            selectedOrderIds = selectedOrderIds.filter(selectedId => selectedId !== id);
        }
    });
    
    updateBulkActionsBar();
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulk-actions-bar');
    const countSpan = document.getElementById('selected-count');
    
    if (!bar) return;
    
    if (selectedOrderIds.length > 0) {
        bar.classList.remove('hidden');
        if (countSpan) countSpan.textContent = selectedOrderIds.length;
    } else {
        bar.classList.add('hidden');
        // Reset bulk selectors
        const statusSel = document.getElementById('bulk-order-status');
        if (statusSel) statusSel.value = '';
        const paySel = document.getElementById('bulk-payment-status');
        if (paySel) paySel.value = '';
    }
}

function clearOrderSelection() {
    selectedOrderIds = [];
    
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('.order-select-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    
    const selectAllCheckbox = document.getElementById('select-all-orders');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    updateBulkActionsBar();
}

async function bulkUpdateStatus(newStatus) {
    if (!newStatus) return;
    if (selectedOrderIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to update ${selectedOrderIds.length} orders to "${newStatus}"?`)) {
        document.getElementById('bulk-order-status').value = '';
        return;
    }
    
    try {
        showToast(`Updating ${selectedOrderIds.length} orders... ⚙️`);
        
        // Loop over each selected ID and post update
        const promises = selectedOrderIds.map(id => 
            fetch(`/api/admin/orders/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, note: 'Bulk updated from admin panel' })
            })
        );
        
        await Promise.all(promises);
        
        showToast('All selected orders updated successfully! ✅');
        clearOrderSelection();
        loadOrders(currentOrdersPage);
        updateNotificationBadge();
    } catch (err) {
        console.error('Error bulk updating status:', err);
        alert('Failed to update some orders. Please try again.');
    }
}

async function bulkUpdatePayment(newPayment) {
    if (!newPayment) return;
    if (selectedOrderIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to mark ${selectedOrderIds.length} orders as "${newPayment}"?`)) {
        document.getElementById('bulk-payment-status').value = '';
        return;
    }
    
    try {
        showToast(`Updating payment status... 💰`);
        
        const promises = selectedOrderIds.map(id => 
            fetch(`/api/admin/orders/${id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newPayment, note: 'Bulk updated from admin panel' })
            })
        );
        
        await Promise.all(promises);
        
        showToast('Payment status updated successfully! ✅');
        clearOrderSelection();
        loadOrders(currentOrdersPage);
    } catch (err) {
        console.error('Error bulk updating payment:', err);
        alert('Failed to update some orders. Please try again.');
    }
}

async function deleteSingleOrder(id) {
    if (!confirm(`Are you sure you want to permanently delete Order #${id}?`)) return;
    
    try {
        const res = await fetch(`/api/admin/orders/${id}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('Failed to delete order');
        const data = await res.json();
        
        showToast('Order deleted successfully! 🗑️');
        loadOrders(currentOrdersPage);
        updateNotificationBadge();
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order. Please try again.');
    }
}

async function bulkDeleteOrders() {
    if (selectedOrderIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to permanently delete ${selectedOrderIds.length} selected orders?`)) return;
    
    try {
        showToast(`Deleting ${selectedOrderIds.length} orders... 🗑️`);
        
        const promises = selectedOrderIds.map(id => 
            fetch(`/api/admin/orders/${id}`, {
                method: 'DELETE'
            })
        );
        
        await Promise.all(promises);
        
        showToast('Selected orders deleted successfully! 🗑️✅');
        clearOrderSelection();
        loadOrders(currentOrdersPage);
        updateNotificationBadge();
    } catch (err) {
        console.error('Error bulk deleting orders:', err);
        alert('Failed to delete some orders. Please try again.');
    }
}

function generateSingleLabelHTML(order, items) {
    const awbNum = 'DSP' + String(order.id).padStart(9, '0');
    const isPaid = order.payment_status === 'Paid';
    const total  = parseFloat(order.total_amount || 0);

    // ── Address parsing
    const fullAddr  = order.address || '';
    const pinMatch  = fullAddr.match(/\b(\d{6})\b/);
    const pincode   = pinMatch ? pinMatch[1] : '';
    // Split by comma OR newline, trim, remove empty & 6-digit PIN parts
    const addrParts = fullAddr.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    const addrNoPin = addrParts.filter(p => !p.match(/^\d{6}$/));
    // Show full address as clean lines (no wrong city/state guessing)
    const addrDisplay = addrNoPin.join('<br>');

    // ── Products rows HTML
    const productRows = (items || []).map((item, i) => {
        const unitPrice = parseFloat(item.price || 0);
        const qty       = parseInt(item.quantity || 1);
        const lineTotal = unitPrice * qty;
        return `
        <tr style="border-bottom:1px solid #fce7f3;">
            <td style="padding:6px 6px 6px 0; font-size:12px; color:#555;">${i + 1}</td>
            <td style="padding:6px 6px; font-size:12px; font-weight:700; color:#1f2937;">${item.name || item.product_name || 'Item'}</td>
            <td style="padding:6px 6px; font-size:12px; text-align:center; color:#555;">× ${qty}</td>
            <td style="padding:6px 6px; font-size:12px; text-align:right; color:#555;">₹${unitPrice.toFixed(0)}</td>
            <td style="padding:6px 0 6px 6px; font-size:12px; font-weight:800; text-align:right; color:#be185d;">₹${lineTotal.toFixed(0)}</td>
        </tr>`;
    }).join('');

    const subtotal  = (items || []).reduce((a, b) => a + (parseFloat(b.price||0) * parseInt(b.quantity||1)), 0);
    const shipping  = parseFloat(order.delivery_charge || 0);
    const discount  = parseFloat(order.discount || 0);

    return `
    <div style="
        width: 100%;
        border: 2.5px solid #be185d;
        border-radius: 8px;
        font-family: 'Arial', Helvetica, sans-serif;
        color: #1f2937;
        box-sizing: border-box;
        display: inline-flex;
        flex-direction: column;
        background: #fff;
        overflow: hidden;
    ">
        <!-- ══ HEADER ══ -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background: linear-gradient(135deg,#be185d,#9d174d); color:#fff;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="display:flex; flex-direction:column; align-items:stretch;">
                        <div style="font-size:30px; font-weight:900; letter-spacing:0px; line-height:1; font-family:'Arial Black',Arial,sans-serif; white-space:nowrap; color:#fff; text-align:center;">DEVANGI</div>
                        <div style="font-size:15px; font-weight:900; font-family:'Arial Black',Arial,sans-serif; color:#ffd6e8; margin-top:2px; display:flex; justify-content:space-between; width:100%; padding:0 3px; box-sizing:border-box;">
                            <span>P</span><span>R</span><span>O</span><span>D</span><span>U</span><span>C</span><span>T</span><span>S</span>
                        </div>
                    </div>
                    <div style="font-size:10px; color:#fce7f3; margin-top:6px; text-align:center; white-space:nowrap;">✦ Quality Sewing Essentials ✦</div>
                </div>
            <div style="text-align:right; font-size:9px; opacity:0.9;">
                <div style="font-weight:800; font-size:11px;">AWB: ${awbNum}</div>
                <div style="margin-top:3px; opacity:0.8;">Order #${order.id}</div>
            </div>
        </div>

        <!-- ══ TO SECTION ══ -->
        <div style="padding:10px 14px; border-bottom:2px dashed #fbcfe8;">
            <div style="
                background:#be185d; color:#fff;
                font-size:10px; font-weight:900; letter-spacing:1px;
                padding:4px 10px; display:inline-block;
                border-radius:3px; margin-bottom:8px;
            ">TO:</div>

            <!-- Name + Mobile row -->
            <div style="display:flex; gap:16px; margin-bottom:8px;">
                <div style="flex:1;">
                    <div style="font-size:10px; color:#9d174d; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Name</div>
                    <div style="font-size:16px; font-weight:900; color:#111827; line-height:1.2;">${order.fullname || ''}</div>
                </div>
                <div style="flex:1;">
                    <div style="font-size:10px; color:#9d174d; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Mobile</div>
                    <div style="font-size:16px; font-weight:900; color:#111827; line-height:1.2;">${order.phone || ''}</div>
                </div>
            </div>

            <!-- Address + Pincode row -->
            <div style="display:flex; gap:10px; align-items:flex-start;">
                <!-- Full address block -->
                <div style="flex:1;">
                    <div style="font-size:10px; color:#9d174d; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">Delivery Address</div>
                    <div style="font-size:13px; font-weight:600; color:#1f2937; line-height:1.7;">${addrDisplay}</div>
                </div>
                <!-- Pincode box -->
                <div style="
                    flex-shrink:0; text-align:center;
                    border:2px solid #be185d; border-radius:6px;
                    padding:6px 10px; min-width:72px;
                ">
                    <div style="font-size:9px; font-weight:800; color:#9d174d; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid #fbcfe8; padding-bottom:3px; margin-bottom:4px;">PIN</div>
                    <div style="font-size:20px; font-weight:900; color:#be185d; letter-spacing:2px; line-height:1;">${pincode}</div>
                </div>
            </div>
        </div>

        <!-- ══ PRODUCTS SECTION ══ -->
        <div style="padding:10px 14px; border-bottom:2px dashed #fbcfe8;">
            <div style="
                font-size:8px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;
                color:#be185d; border-bottom:1.5px solid #fbcfe8; padding-bottom:5px; margin-bottom:6px;
            ">📦 PRODUCT DETAILS</div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#fdf2f8;">
                        <th style="padding:5px 6px 5px 0; font-size:10px; font-weight:800; color:#9d174d; text-align:left; width:20px;">#</th>
                        <th style="padding:5px 6px; font-size:10px; font-weight:800; color:#9d174d; text-align:left;">PRODUCT</th>
                        <th style="padding:5px 6px; font-size:10px; font-weight:800; color:#9d174d; text-align:center;">QTY</th>
                        <th style="padding:5px 6px; font-size:10px; font-weight:800; color:#9d174d; text-align:right;">RATE</th>
                        <th style="padding:5px 0 5px 6px; font-size:10px; font-weight:800; color:#9d174d; text-align:right;">AMT</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>

            <!-- Totals -->
            <div style="margin-top:6px; border-top:1.5px solid #fbcfe8; padding-top:6px; display:flex; justify-content:flex-end;">
                <table style="font-size:12px; border-collapse:collapse;">
                    ${shipping > 0 ? `<tr>
                        <td style="padding:2px 12px 2px 0; color:#6b7280;">Subtotal</td>
                        <td style="padding:2px 0; text-align:right; font-weight:700;">₹${subtotal.toFixed(0)}</td>
                    </tr>
                    <tr>
                        <td style="padding:2px 12px 2px 0; color:#6b7280;">Shipping</td>
                        <td style="padding:2px 0; text-align:right; font-weight:700;">₹${shipping.toFixed(0)}</td>
                    </tr>` : ''}
                    ${discount > 0 ? `<tr>
                        <td style="padding:2px 12px 2px 0; color:#10b981;">Discount</td>
                        <td style="padding:2px 0; text-align:right; font-weight:700; color:#10b981;">- ₹${discount.toFixed(0)}</td>
                    </tr>` : ''}
                    <tr style="border-top:2px solid #be185d;">
                        <td style="padding:6px 12px 6px 0; font-size:14px; font-weight:900; color:#be185d;">TOTAL</td>
                        <td style="padding:6px 0; text-align:right; font-size:16px; font-weight:900; color:#be185d;">₹${total.toFixed(0)}</td>
                    </tr>
                    <tr>
                        <td style="padding:2px 12px 2px 0; font-size:11px; color:#6b7280;">To Collect</td>
                        <td style="padding:2px 0; text-align:right; font-size:13px; font-weight:900; color:${isPaid ? '#10b981' : '#dc2626'};">
                            ${isPaid ? 'PAID ✓' : '₹' + total.toFixed(0)}
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- ══ FROM SECTION ══ -->
        <div style="padding:8px 14px; display:flex; justify-content:space-between; align-items:center; background:#fdf2f8;">
            <div style="font-size:9px; color:#9d174d; line-height:1.8;">
                <span style="
                    background:#be185d; color:#fff;
                    font-size:7px; font-weight:900;
                    padding:2px 6px; border-radius:3px; margin-right:5px;
                ">FROM:</span>
                <strong style="font-size:10px;">Devangi Products</strong><br>
                <span style="margin-left:52px;">Yogichowk, Surat, Gujarat - 395010</span><br>
                <span style="margin-left:52px;">Mo. 7600550038</span>
            </div>
            <div style="text-align:center; color:#be185d; flex-shrink:0;">
                <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="5" width="24" height="13" rx="2" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <rect x="24" y="8" width="11" height="10" rx="1" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <line x1="2" y1="5" x2="2" y2="2.5" stroke="#be185d" stroke-width="1.8"/>
                    <line x1="2" y1="2.5" x2="11" y2="2.5" stroke="#be185d" stroke-width="1.8"/>
                    <circle cx="7.5" cy="19" r="2.8" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <circle cx="29" cy="19" r="2.8" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <line x1="0" y1="18" x2="4.7" y2="18" stroke="#be185d" stroke-width="1.2"/>
                    <line x1="10.3" y1="18" x2="26.2" y2="18" stroke="#be185d" stroke-width="1.2"/>
                    <line x1="31.8" y1="18" x2="36" y2="18" stroke="#be185d" stroke-width="1.8"/>
                </svg>
                <div style="font-size:7px; font-weight:900; margin-top:2px; color:#be185d;">THANK YOU! ♥</div>
            </div>
        </div>
    </div>`;
}

function generateSingleInvoiceHTML(order, items) {
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const itemsHTML = items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
    <div class="invoice-page">
        <div style="font-family: 'Poppins', sans-serif; padding: 40px; color: #333; height: 100%; display: flex; flex-direction: column; flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                <div>
                    <h1 style="color: #db2777; margin: 0; font-size: 28px;">INVOICE</h1>
                    <p style="margin: 5px 0; color: #666;">#${order.id}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-weight: bold;">Devangi Products</p>
                    <p style="margin: 5px 0; color: #666; font-size: 12px;">Surat, Gujarat, India</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div>
                    <h4 style="text-transform: uppercase; font-size: 10px; color: #999; margin-bottom: 10px;">Bill To</h4>
                    <p style="margin: 0; font-weight: bold;">${order.fullname}</p>
                    <p style="margin: 5px 0; font-size: 13px; line-height: 1.5;">${order.address}</p>
                    <p style="margin: 5px 0; font-size: 13px;">${order.email || '-'}</p>
                    <p style="margin: 5px 0; font-size: 13px;">${order.phone}</p>
                </div>
                <div style="text-align: right;">
                    <h4 style="text-transform: uppercase; font-size: 10px; color: #999; margin-bottom: 10px;">Invoice Details</h4>
                    <p style="margin: 5px 0; font-size: 13px;">Date: <span>${formatDateDDMMYYYY(order.created_at)}</span></p>
                    <p style="margin: 5px 0; font-size: 13px;">Payment: <span>${order.payment_method}</span></p>
                    <p style="margin: 5px 0; font-size: 13px;">Status: <span>${order.payment_status}</span></p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background: #f9f9f9; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #eee; font-size: 12px;">Item Description</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; text-align: center;">Qty</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; text-align: right;">Price</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 250px; space-y: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span style="color: #666; font-size: 13px;">Subtotal</span>
                        <span style="font-weight: 500;">Rs. ${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span style="color: #666; font-size: 13px;">Shipping</span>
                        <span style="font-weight: 500;">Rs. ${parseFloat(order.delivery_charge || 0).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #eee; margin-top: 10px;">
                        <span style="font-weight: bold;">Grand Total</span>
                        <span style="font-weight: bold; color: #db2777; font-size: 18px;">Rs. ${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: auto; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 11px;">
                <p>Thank you for shopping with Devangi Products!</p>
            </div>
        </div>
    </div>
    `;
}

async function bulkPrintInvoices() {
    if (selectedOrderIds.length === 0) return;
    
    try {
        showToast(`Loading data for ${selectedOrderIds.length} orders... ⚙️`);
        
        const ordersData = await Promise.all(
            selectedOrderIds.map(id => 
                fetch(`/api/admin/orders/${id}`).then(r => {
                    if (!r.ok) throw new Error(`Failed to load order #${id}`);
                    return r.json();
                })
            )
        );
        
        const printWindow = window.open('', '_blank', 'width=900,height=750');
        if (!printWindow) {
            alert('Popup blocked! Please allow popups for this site and try again.');
            return;
        }
        
        const invoicesHTML = ordersData.map(data => generateSingleInvoiceHTML(data.order, data.items)).join('');
        
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk Invoices (${ordersData.length} Orders)</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; font-family:'Poppins', sans-serif; margin: 0; padding: 0; }

        @page { size: A4 portrait; margin: 0; }

        .invoice-page {
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            box-sizing: border-box;
            background: #fff;
            display: flex;
            flex-direction: column;
            page-break-after: always;
            break-after: page;
        }
        .invoice-page > div {
            display: flex;
            flex-direction: column;
            flex: 1;
            height: 100%;
        }
        .invoice-page > div > div:last-child {
            margin-top: auto !important;
        }

        @media print {
            body { 
                margin: 0; 
                padding: 0; 
            }
            .no-print { display:none !important; }
            .invoice-page { 
                page-break-after: always; 
                break-after: page;
            }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position:fixed;top:10px;right:10px;z-index:100;display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#be185d;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ Print Invoices</button>
        <button onclick="window.close()" style="background:#e5e7eb;color:#333;border:none;padding:10px 16px;border-radius:6px;font-size:14px;cursor:pointer;">✕ Close</button>
    </div>

    ${invoicesHTML}
</body>
</html>`);
        
        printWindow.document.close();
        showToast('Bulk invoices ready! 📥');
    } catch (err) {
        console.error('Error preparing bulk invoices:', err);
        alert('Failed to generate invoices. Please try again.');
    }
}

async function bulkPrintLabels() {
    if (selectedOrderIds.length === 0) return;
    
    showToast(`Preparing ${selectedOrderIds.length} labels... 🏷️`);
    
    try {
        const ordersData = await Promise.all(
            selectedOrderIds.map(id => 
                fetch(`/api/admin/orders/${id}`).then(r => {
                    if (!r.ok) throw new Error(`Failed to load order #${id}`);
                    return r.json();
                })
            )
        );
        
        const printWindow = window.open('', '_blank', 'width=900,height=750');
        if (!printWindow) {
            alert('Popup blocked! Please allow popups for this site and try again.');
            return;
        }
        
        // Generate single label HTML and Thank You Card HTML for each order
        const labelsHTML = ordersData.map(data => generateSingleLabelHTML(data.order, data.items));
        const thankYouHTMLs = ordersData.map(data => generateThankYouCardHTML(data.order));
        
        // Group labels into A4 pages (2 orders per A4 page, keeping label and its thank you card in the same column)
        let pagesHTML = '';
        for (let i = 0; i < labelsHTML.length; i += 2) {
            const cell1 = labelsHTML[i] || '';
            const cell2 = labelsHTML[i+1] || '';
            const cell3 = thankYouHTMLs[i] || '';
            const cell4 = labelsHTML[i+1] ? thankYouHTMLs[i+1] : '';
            
            pagesHTML += `
            <div class="page">
                <div class="cut-h"></div>
                <div class="cut-v"></div>
                <div class="scissor-h">✂</div>
                <div class="scissor-v">✂</div>
                
                <div class="label-cell">${cell1}</div>
                <div class="label-cell">${cell2}</div>
                <div class="label-cell">${cell3}</div>
                <div class="label-cell">${cell4}</div>
            </div>`;
        }
        
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk Courier Labels (${ordersData.length} Orders)</title>
    <!-- Load Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; font-family:Arial,Helvetica,sans-serif; }

        @page { size: A4 portrait; margin: 6mm; }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 6mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 0;
            position: relative;
            page-break-after: always;
            break-after: page;
        }

        .label-cell {
            padding: 5mm;
            position: relative;
        }

        /* Cut lines */
        .cut-h {
            position: absolute; left:0; right:0; top:50%;
            border-top: 1px dashed #ccc; z-index:10;
        }
        .cut-v {
            position: absolute; top:0; bottom:0; left:50%;
            border-left: 1px dashed #ccc; z-index:10;
        }
        .scissor-h {
            position:absolute; top:50%; left:4px;
            transform:translateY(-50%);
            font-size:13px; color:#bbb; z-index:11;
        }
        .scissor-v {
            position:absolute; left:50%; top:4px;
            transform:translateX(-50%);
            font-size:13px; color:#bbb; z-index:11;
        }

        @media print {
            body { margin:0; }
            .no-print { display:none !important; }
            .page { page-break-after: always; break-after: page; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position:fixed;top:10px;right:10px;z-index:100;display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#be185d;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ Print Labels</button>
        <button onclick="window.close()" style="background:#e5e7eb;color:#333;border:none;padding:10px 16px;border-radius:6px;font-size:14px;cursor:pointer;">✕ Close</button>
    </div>

    ${pagesHTML}
</body>
</html>`);
        
        printWindow.document.close();
        showToast('Bulk labels ready! 🏷️');
    } catch (err) {
        console.error('Error preparing bulk labels:', err);
        alert('Failed to generate labels. Please try again.');
    }
}

function generateThankYouCardHTML(order) {
    const customerName = order.fullname || 'Valued Customer';
    const firstName = customerName.split(' ')[0];

    return `
    <div style="
        width: 90%;
        margin: 0 auto;
        aspect-ratio: 1 / 1;
        border: 2.5px solid #be185d;
        border-radius: 12px;
        font-family: 'Poppins', 'Arial', sans-serif;
        color: #1f2937;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        background: #fffdfc;
        overflow: hidden;
        position: relative;
        justify-content: space-between;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    ">
        <!-- Inner Stitched Line -->
        <div style="
            position: absolute;
            top: 6px;
            left: 6px;
            right: 6px;
            bottom: 6px;
            border: 1.5px dashed #be185d;
            border-radius: 8px;
            pointer-events: none;
            opacity: 0.75;
            z-index: 5;
        "></div>



        <!-- Header -->
        <div style="text-align: center; margin-top: 10px;">
            <div style="
                font-family: 'Playfair Display', 'Georgia', serif;
                font-style: italic;
                font-size: 26px;
                color: #be185d;
                font-weight: 700;
                line-height: 1.2;
            ">Thank You</div>
            <div style="
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 3px;
                color: #9d174d;
                text-transform: uppercase;
                margin-top: 4px;
            ">for your order</div>
        </div>

        <!-- Message Body -->
        <div style="margin: 15px 0; text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px;">
            <p style="
                font-family: 'Playfair Display', 'Georgia', serif;
                font-style: italic;
                font-size: 20px;
                color: #be185d;
                font-weight: 600;
                margin-bottom: 2px;
            ">Dear ${firstName},</p>
            <p style="
                font-size: 11px;
                line-height: 1.7;
                color: #4b5563;
                font-weight: 500;
                max-width: 95%;
                margin: 0 auto;
            ">
                We are so incredibly grateful for your support of our small business! 
                Your products have been carefully packed with love. We hope they bring inspiration 
                and joy to your beautiful sewing projects.
            </p>
        </div>

        <!-- Footer -->
        <div style="
            border-top: 1px solid #fbcfe8;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <div style="font-size: 8px; color: #6b7280; line-height: 1.4; text-align: left;">
                <strong>Devangi Products</strong><br>
                Yogichowk, Surat, Gujarat<br>
                Mo. 7600550038
            </div>
            <div style="text-align: right; color: #be185d;">
                <svg width="24" height="18" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.8; display: inline-block;">
                    <rect x="0" y="5" width="24" height="13" rx="2" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <rect x="24" y="8" width="11" height="10" rx="1" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <line x1="2" y1="5" x2="2" y2="2.5" stroke="#be185d" stroke-width="1.8"/>
                    <line x1="2" y1="2.5" x2="11" y2="2.5" stroke="#be185d" stroke-width="1.8"/>
                    <circle cx="7.5" cy="19" r="2.8" stroke="#be185d" stroke-width="1.8" fill="none"/>
                    <circle cx="29" cy="19" r="2.8" stroke="#be185d" stroke-width="1.8" fill="none"/>
                </svg>
                <div style="font-size: 6.5px; font-weight: 800; color: #be185d; margin-top: 2px;">WITH LOVE ♥</div>
            </div>
        </div>
    </div>`;
}

// ===== EDIT ORDER FLOW =====
let editOrderItems = [];

async function openEditOrderModal() {
    if (!currentOrderData || !currentOrderData.order) {
        alert('No order data found.');
        return;
    }
    
    // Close order details modal
    toggleModal('orderDetailModal');
    
    const order = currentOrderData.order;
    const items = currentOrderData.items;
    
    // Open edit order modal
    toggleModal('editOrderModal');
    
    if (document.getElementById('eo_pincode_error')) document.getElementById('eo_pincode_error').style.display = 'none';
    if (document.getElementById('eo_phone_error')) document.getElementById('eo_phone_error').style.display = 'none';
    
    // Populate form fields
    document.getElementById('edit_order_id').value = order.id;
    document.getElementById('eo_order_id_title').innerText = '#' + order.id;
    document.getElementById('eo_first_name').value = order.first_name || '';
    document.getElementById('eo_last_name').value = order.last_name || '';
    document.getElementById('eo_phone').value = order.phone || '';
    document.getElementById('eo_email').value = order.email || '';
    
    document.getElementById('eo_house_no').value = order.house_no || '';
    document.getElementById('eo_society').value = order.society || '';
    document.getElementById('eo_street').value = order.street || '';
    document.getElementById('eo_landmark').value = order.landmark || '';
    document.getElementById('eo_city').value = order.city || '';
    document.getElementById('eo_state').value = order.state || '';
    document.getElementById('eo_pincode').value = order.pincode || '';
    
    document.getElementById('eo_payment_method').value = order.payment_method || 'COD';
    document.getElementById('eo_payment_status').value = order.payment_status || 'Pending';
    document.getElementById('eo_status').value = order.status || 'Order Placed';
    document.getElementById('eo_delivery_charge').value = order.delivery_charge || 0;
    
    // Populate items array
    editOrderItems = items.map(item => ({
        id: item.product_id || item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity) || 1,
        image: item.image || ''
    }));
    
    renderEditOrderItems();
    updateEditOrderSummary();
    
    // Populate products dropdown
    const select = document.getElementById('eo_product_select');
    if (select) {
        if (allProducts.length === 0) {
            select.innerHTML = '<option value="">-- Loading products... --</option>';
            try {
                const res = await fetch('/api/products');
                if (res.ok) {
                    allProducts = await res.json();
                }
            } catch (err) {
                console.error("Error loading products in edit order:", err);
            }
        }
        select.innerHTML = '<option value="">-- Select Product --</option>';
        allProducts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.title} - Rs. ${p.price}`;
            select.appendChild(opt);
        });
    }
}

function addEditOrderItem() {
    const select = document.getElementById('eo_product_select');
    const qtyInput = document.getElementById('eo_product_qty');
    
    const productId = select.value;
    const qty = parseInt(qtyInput.value) || 1;
    
    if (!productId) {
        alert('Please select a product first.');
        return;
    }
    
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;
    
    const existingIndex = editOrderItems.findIndex(item => item.id == productId);
    if (existingIndex > -1) {
        editOrderItems[existingIndex].quantity += qty;
    } else {
        const image = (product.images && product.images[0]) || product.image || '';
        editOrderItems.push({
            id: product.id,
            name: product.title,
            price: product.price,
            quantity: qty,
            image: image
        });
    }
    
    select.value = '';
    qtyInput.value = 1;
    
    renderEditOrderItems();
    recalculateEditOrderShipping();
    updateEditOrderSummary();
    showToast('Product added to order! 🛍️');
}

function removeEditOrderItem(index) {
    editOrderItems.splice(index, 1);
    renderEditOrderItems();
    recalculateEditOrderShipping();
    updateEditOrderSummary();
}

function renderEditOrderItems() {
    const tbody = document.getElementById('eo_items_tbody');
    tbody.innerHTML = '';
    
    if (editOrderItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-4 text-center text-gray-400 italic">No products added yet.</td>
            </tr>
        `;
        return;
    }
    
    editOrderItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100 hover:bg-gray-50';
        tr.innerHTML = `
            <td class="p-2 text-gray-700">${item.name}</td>
            <td class="p-2 text-center text-gray-800 font-medium">${item.quantity}</td>
            <td class="p-2 text-right text-gray-600">Rs. ${item.price.toFixed(2)}</td>
            <td class="p-2 text-right text-gray-900 font-medium">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
            <td class="p-2 text-center">
                <button type="button" onclick="removeEditOrderItem(${index})" class="text-red-500 hover:text-red-700 font-bold">
                    ✕
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateEditOrderSummary() {
    const subtotal = editOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCharge = parseFloat(document.getElementById('eo_delivery_charge').value) || 0;
    const grandTotal = subtotal + deliveryCharge;
    
    document.getElementById('eo_subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('eo_grand_total').textContent = grandTotal.toFixed(2);
}

async function submitEditOrder(event) {
    event.preventDefault();
    
    if (editOrderItems.length === 0) {
        alert('Please add at least one product to the order.');
        return;
    }
    
    const orderId = document.getElementById('edit_order_id').value;
    const first_name = document.getElementById('eo_first_name').value.trim();
    const last_name = document.getElementById('eo_last_name').value.trim();
    const phone = document.getElementById('eo_phone').value.trim();
    const email = document.getElementById('eo_email').value.trim() || '';
    
    validateAdminPhone('eo_phone', 'eo_phone_error');
    recalculateEditOrderShipping();
    
    if (!/^[0-9]{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit Phone Number.');
        return;
    }
    
    const house_no = document.getElementById('eo_house_no').value.trim();
    const society = document.getElementById('eo_society').value.trim();
    const street = document.getElementById('eo_street').value.trim();
    const landmark = document.getElementById('eo_landmark').value.trim() || '';
    const city = document.getElementById('eo_city').value.trim();
    const state = document.getElementById('eo_state').value.trim();
    const pincode = document.getElementById('eo_pincode').value.trim();
    
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
        alert('Please enter a valid 6-digit Indian Pincode.');
        return;
    }
    
    const fullAddress = `${house_no}, ${society}, ${street}, ${landmark ? landmark + ', ' : ''}${city}, ${state} - ${pincode}`;
    const delivery_charge = parseFloat(document.getElementById('eo_delivery_charge').value) || 0;
    const subtotal = parseFloat(document.getElementById('eo_subtotal').textContent);
    const total_amount = subtotal + delivery_charge;
    
    const payment_method = document.getElementById('eo_payment_method').value;
    const payment_status = document.getElementById('eo_payment_status').value;
    const status = document.getElementById('eo_status').value;
    
    const payload = {
        first_name,
        last_name,
        fullname: `${first_name} ${last_name}`,
        email,
        phone,
        house_no,
        society,
        street,
        landmark,
        city,
        state,
        pincode,
        address: fullAddress,
        items: editOrderItems,
        delivery_charge,
        total_amount,
        payment_method,
        payment_status,
        status,
        label: 'Home'
    };
    
    try {
        const btn = event.submitter || document.querySelector('#editOrderForm button[type="submit"]');
        if (btn) btn.disabled = true;
        
        const res = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (btn) btn.disabled = false;
        
        if (res.ok) {
            toggleModal('editOrderModal');
            loadOrders(); // Refresh order listing
            
            // Re-open updated order detail modal
            setTimeout(() => {
                openEditOrderDetail(orderId);
            }, 300);
            
            showToast('Order details updated! 📝');
        } else {
            const data = await res.json();
            alert('Error updating order: ' + data.error);
        }
    } catch (error) {
        console.error('Error submitting edit order:', error);
        alert('Failed to update order. Please try again.');
        const btn = document.querySelector('#editOrderForm button[type="submit"]');
        if (btn) btn.disabled = false;
    }
}

// Re-open order details after edit completes
async function openEditOrderDetail(id) {
    try {
        await openOrderDetail(id);
    } catch (err) {
        console.error('Error re-opening order details:', err);
    }
}

// Sidebar permission mapping & check
const permissionMap = {
    'index.html': 'dashboard',
    'orders.html': 'orders',
    'products.html': 'products',
    'categories.html': 'categories',
    'users.html': 'users',
    'coupons.html': 'coupons',
    'banners.html': 'banners',
    'reviews.html': 'reviews',
    'navigation.html': 'navigation',
    'contact.html': 'contact',
    'reports.html': 'reports',
    'settings.html': 'settings',
    'staff.html': 'settings'
};

async function checkAdminPermissions() {
    try {
        const res = await fetch('/api/admin/session');
        if (!res.ok) return;
        const data = await res.json();
        if (data.loggedIn && data.admin) {
            if (data.isSuper) return; // Super admins see everything
            const permissions = data.admin.permissions || [];
            const sidebarLinks = document.querySelectorAll("#admin-sidebar a");
            sidebarLinks.forEach(link => {
                const href = link.getAttribute("href");
                if (href) {
                    const page = href.split('/').pop().split('?')[0];
                    const requiredPermission = permissionMap[page];
                    if (requiredPermission && !permissions.includes(requiredPermission)) {
                        link.style.display = 'none';
                    }
                }
            });
        }
    } catch (err) {
        console.error("Error checking admin permissions:", err);
    }
}
