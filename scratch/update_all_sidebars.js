const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '..', 'admin');
const filesToUpdate = ['index.html', 'orders.html', 'products.html', 'categories.html', 'users.html', 'banners.html', 'navigation.html', 'contact.html', 'user_details.html'];

const newSidebarSection = `
            <a href="coupons.html" class="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group">
                    <svg class="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                    Coupons
                </a>`;

const analyticsSection = `
            <div class="pt-4 mt-4 border-t border-gray-100">
                <p class="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Analytics</p>
                <a href="reports.html" class="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group">
                    <svg class="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    Reports
                </a>
                <a href="settings.html" class="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group">
                    <svg class="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Settings
                </a>
            </div>`;

let updated = 0;

filesToUpdate.forEach(file => {
    const filePath = path.join(adminDir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Add Coupons link after Users if not already there
    if (!content.includes('coupons.html') && content.includes('users.html')) {
        content = content.replace(
            /(Users\s*<\/a>)/,
            `$1\n${newSidebarSection}`
        );
        modified = true;
    }
    
    // Add Analytics section before "View Live Store" or end of sidebar if not there
    if (!content.includes('reports.html') && !content.includes('settings.html')) {
        // Find the closing of Storefront section and add after it
        const storefrontEndRegex = /(Contact Settings\s*<\/a>\s*<\/div>)/;
        if (storefrontEndRegex.test(content)) {
            content = content.replace(storefrontEndRegex, `$1${analyticsSection}`);
            modified = true;
        }
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        updated++;
        console.log(`Updated: ${file}`);
    } else {
        console.log(`Skipped (already up-to-date): ${file}`);
    }
});

console.log(`\nDone! Updated ${updated} files.`);
