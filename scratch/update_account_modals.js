const fs = require('fs');
const path = require('path');

const accountPath = path.join(__dirname, '..', 'account.html');
let html = fs.readFileSync(accountPath, 'utf8');

// 1. Fix orderDetailsModal Header
html = html.replace(/<div class="bg-white px-8 py-6 border-b border-gray-100/g, '<div class="bg-white px-4 md:px-8 py-4 md:py-6 border-b border-gray-100');
html = html.replace(/<h3 class="text-2xl font-black/g, '<h3 class="text-lg md:text-2xl font-black');

// 2. Fix orderDetailsModal Content Padding
html = html.replace(/<div class="flex-grow overflow-y-auto p-8" id="order-details-content">/g, '<div class="flex-grow overflow-y-auto p-4 md:p-8" id="order-details-content">');

// 3. Fix internal paddings inside openOrderDetails template
html = html.replace(/<div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">/g, '<div class="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-4 md:p-8 shadow-sm">');
html = html.replace(/<div class="px-8 py-5 border-b border-gray-50/g, '<div class="px-4 md:px-8 py-4 md:py-5 border-b border-gray-50');
html = html.replace(/<div class="p-8 space-y-6">/g, '<div class="p-4 md:p-8 space-y-4 md:space-y-6">');
html = html.replace(/<img src="\${item.image \|\| PLACEHOLDER_IMG}" class="w-20 h-20/g, '<img src="${item.image || PLACEHOLDER_IMG}" class="w-14 h-14 md:w-20 md:h-20');

// Fix text sizes in payment summary
html = html.replace(/<p class="text-3xl font-black text-gray-900">Rs./g, '<p class="text-xl md:text-3xl font-black text-gray-900">Rs.');

// 4. Fix Invoice Modal Padding
html = html.replace(/<div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-\[90vh\] overflow-y-auto p-8">/g, '<div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-8">');
html = html.replace(/<div class="p-8 border-2 border-gray-100 rounded-3xl bg-white shadow-inner/g, '<div class="p-4 md:p-8 border-2 border-gray-100 rounded-2xl md:rounded-3xl bg-white shadow-inner');
html = html.replace(/<h1 class="text-3xl font-black text-pink-600/g, '<h1 class="text-xl md:text-3xl font-black text-pink-600');
html = html.replace(/<div class="grid grid-cols-2 gap-12 mb-10">/g, '<div class="grid grid-cols-2 gap-4 md:gap-12 mb-6 md:mb-10">');
html = html.replace(/<span class="text-2xl font-black text-pink-600">Rs./g, '<span class="text-lg md:text-2xl font-black text-pink-600">Rs.');

fs.writeFileSync(accountPath, html);
console.log("Successfully updated account.html modals");
