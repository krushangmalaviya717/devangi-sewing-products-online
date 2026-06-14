'use strict';

// modal variables
const modal = document.querySelector('[data-modal]');
const modalCloseBtn = document.querySelector('[data-modal-close]');
const modalCloseOverlay = document.querySelector('[data-modal-overlay]');

// modal function
const modalCloseFunc = function () { modal.classList.add('closed') }

// modal eventListener
if (modalCloseOverlay) modalCloseOverlay.addEventListener('click', modalCloseFunc);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', modalCloseFunc);





// notification toast variables
const notificationToast = document.querySelector('[data-toast]');
const toastCloseBtn = document.querySelector('[data-toast-close]');

// notification toast eventListener
if (toastCloseBtn) {
  toastCloseBtn.addEventListener('click', function () {
    notificationToast.classList.add('closed');
  });
}





// mobile menu variables
const mobileMenuOpenBtn = document.querySelectorAll('[data-mobile-menu-open-btn]');
const mobileMenu = document.querySelectorAll('[data-mobile-menu]');
const mobileMenuCloseBtn = document.querySelectorAll('[data-mobile-menu-close-btn]');
const overlay = document.querySelector('[data-overlay]');

// mobile menu function
const mobileMenuCloseFunc = function () {
  for (let i = 0; i < mobileMenu.length; i++) {
    mobileMenu[i].classList.remove('active');
  }
  if (overlay) overlay.classList.remove('active');
}

for (let i = 0; i < mobileMenuOpenBtn.length; i++) {
  mobileMenuOpenBtn[i].addEventListener('click', function () {
    let isGrid = this.querySelector('ion-icon[name="grid-outline"]');
    let menuIndex = isGrid ? 1 : 0;
    if (mobileMenu.length === 1) menuIndex = 0; // Fallback if only 1 menu exists

    if (mobileMenu[menuIndex]) {
      mobileMenu[menuIndex].classList.add('active');
      if (overlay) overlay.classList.add('active');
    }
  });
}

for (let i = 0; i < mobileMenuCloseBtn.length; i++) {
  mobileMenuCloseBtn[i].addEventListener('click', mobileMenuCloseFunc);
}

if (overlay) {
  overlay.addEventListener('click', mobileMenuCloseFunc);
}





// accordion variables
const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
const accordion = document.querySelectorAll('[data-accordion]');

for (let i = 0; i < accordionBtn.length; i++) {

  accordionBtn[i].addEventListener('click', function () {

    const clickedBtn = this.nextElementSibling.classList.contains('active');

    for (let i = 0; i < accordion.length; i++) {

      if (clickedBtn) break;

      if (accordion[i].classList.contains('active')) {

        accordion[i].classList.remove('active');
        accordionBtn[i].classList.remove('active');

      }

    }

    this.nextElementSibling.classList.toggle('active');
    this.classList.toggle('active');

  });

}

// --- LIVE SEARCH SUGGESTIONS ---
const searchInputs = document.querySelectorAll('.search-field');

searchInputs.forEach(input => {
  const container = input.parentElement;
  let suggestionsBox = container.querySelector('.search-suggestions');
  
  if (!suggestionsBox) {
    suggestionsBox = document.createElement('div');
    suggestionsBox.className = 'search-suggestions';
    container.style.position = 'relative';
    container.appendChild(suggestionsBox);
  }

  input.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      suggestionsBox.style.display = 'none';
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const products = await response.json();

      if (products.length > 0) {
        suggestionsBox.innerHTML = products.map(p => `
          <div class="search-suggestion-item" onclick="location.href='/product.html?id=${p.id}'">
            <img src="${p.image}" alt="${p.title}">
            <div style="flex: 1;">
              <div class="title">${p.title}</div>
              <div class="price">Rs. ${p.price}</div>
            </div>
          </div>
        `).join('');
        suggestionsBox.style.display = 'block';
      } else {
        suggestionsBox.style.display = 'none';
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  });
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.header-search-container')) {
    document.querySelectorAll('.search-suggestions').forEach(box => {
      box.style.display = 'none';
    });
  }
});
// Search button click or Enter key
document.querySelectorAll('.header-search-container').forEach(container => {
  const input = container.querySelector('.search-field');
  const btn = container.querySelector('.search-btn');
  
  const performSearch = () => {
    const query = input.value.trim();
    if (query) {
      window.location.href = '/shop.html?search=' + encodeURIComponent(query);
    }
  };

  if (btn) btn.addEventListener('click', performSearch);
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }
});
