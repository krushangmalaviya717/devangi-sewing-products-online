const fs = require('fs');
const path = require('path');

const adminDir = path.join('e:', 'website', 'Devangi Products', 'admin');

const titles = {
    'orders.html': 'Order Management',
    'products.html': 'Products Inventory',
    'users.html': 'Customer Management',
    'categories.html': 'Categories',
    'banners.html': 'Store Banners',
    'navigation.html': 'Navigation Menus',
    'contact.html': 'Contact Settings',
    'user_details.html': 'User Details'
};

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && f !== 'index.html');

for (const file of files) {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    const title = titles[file] || 'Admin Dashboard';
    
    // The top header looks like:
    // <div class="flex items-center gap-3">
    //     <button onclick="toggleMobileMenu()" class="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
    //         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
    //     </button>
    //     
    // </div>
    
    // Or it might be missing the <h1> completely. We need to inject:
    // <h1 class="text-xl font-bold text-gray-800 hidden sm:block tracking-tight">TITLE</h1>
    // right after the closing </button> in the top header.
    
    // Find the toggleMobileMenu button in the header (the one with -ml-2)
    const buttonSearch = '<button onclick="toggleMobileMenu()" class="md:hidden p-2 -ml-2';
    const buttonStartIdx = content.indexOf(buttonSearch);
    
    if (buttonStartIdx !== -1) {
        // Find the closing </button> for this button
        const buttonCloseSearch = '</button>';
        const buttonCloseIdx = content.indexOf(buttonCloseSearch, buttonStartIdx);
        
        if (buttonCloseIdx !== -1) {
            const insertPos = buttonCloseIdx + buttonCloseSearch.length;
            
            // Check if there's already an <h1> there (just in case)
            const nextPart = content.substring(insertPos, insertPos + 100);
            if (!nextPart.includes('<h1')) {
                const injection = `\n                <h1 class="text-xl font-bold text-gray-800 hidden sm:block tracking-tight">${title}</h1>`;
                content = content.substring(0, insertPos) + injection + content.substring(insertPos);
                fs.writeFileSync(filePath, content, 'utf-8');
                console.log(`Fixed header in ${file}`);
            } else {
                console.log(`${file} already has an h1 in the top header.`);
            }
        }
    } else {
        console.log(`Could not find header button in ${file}`);
    }
}
console.log("All done!");
