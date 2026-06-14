const fs = require('fs');
const path = require('path');

const adminDir = path.join('e:', 'website', 'devangi sewing products', 'admin');
const indexHtml = fs.readFileSync(path.join(adminDir, 'index.html'), 'utf-8');

// Extract Sidebar and Top Header from index.html
const sidebarMatch = indexHtml.match(/<!-- Mobile Overlay -->[\s\S]*?<!-- Main Content -->/);
if (!sidebarMatch) {
    console.error("Could not find sidebar in index.html");
    process.exit(1);
}

const sidebarBase = sidebarMatch[0];

// Extract Top Header
const topHeaderMatch = indexHtml.match(/<!-- Top Header -->[\s\S]*?<\/header>/);
if (!topHeaderMatch) {
    console.error("Could not find top header in index.html");
    process.exit(1);
}
const topHeaderBase = topHeaderMatch[0];

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && f !== 'index.html');

// Map of page titles
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

for (const file of files) {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Replace Body tag
    content = content.replace(/<body[^>]*>/, '<body class="text-gray-800 antialiased overflow-hidden flex h-screen">');

    // Find the start of the body content
    const bodyMatch = content.match(/<body[^>]*>/);
    if (!bodyMatch) continue;
    const bodyEndIdx = bodyMatch.index + bodyMatch[0].length;

    const mainIdx = content.indexOf('<main');
    if (mainIdx === -1) {
        console.log(`Skipping ${file}: couldn't find <main>`);
        continue;
    }
    const mainCloseBracket = content.indexOf('>', mainIdx);

    // Prepare custom header
    let pageTitle = titles[file] || 'Admin Dashboard';
    let customTopHeader = topHeaderBase.replace('Dashboard Overview', pageTitle);
    
    let customSidebar = sidebarBase.replace(
        /class="flex items-center px-3 py-2\.5 bg-pink-50 text-pink-700 rounded-lg font-semibold transition-colors group"/,
        'class="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group"'
    ).replace(
        /<svg class="w-5 h-5 mr-3 text-pink-500"/,
        '<svg class="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500 transition-colors"'
    );
    
    const replacement = `\n${customSidebar}
    <div class="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        ${customTopHeader}
        <!-- Content Area -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
`;

    const beforeSidebar = content.substring(0, bodyEndIdx);
    let afterMain = content.substring(mainCloseBracket + 1);

    // Add CSS if missing
    let finalBeforeSidebar = beforeSidebar;
    if (!finalBeforeSidebar.includes('::-webkit-scrollbar')) {
        const styleCloseIdx = finalBeforeSidebar.lastIndexOf('</style>');
        if (styleCloseIdx !== -1) {
            const newStyle = `
        /* Custom Scrollbar for cleaner look */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;
            finalBeforeSidebar = finalBeforeSidebar.substring(0, styleCloseIdx) + newStyle + finalBeforeSidebar.substring(styleCloseIdx);
        } else {
            const headCloseIdx = finalBeforeSidebar.indexOf('</head>');
            if (headCloseIdx !== -1) {
                const newStyle = `<style>
        /* Custom Scrollbar for cleaner look */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>\n`;
                finalBeforeSidebar = finalBeforeSidebar.substring(0, headCloseIdx) + newStyle + finalBeforeSidebar.substring(headCloseIdx);
            }
        }
    }

    content = finalBeforeSidebar + replacement + afterMain;

    // Remove old h1 tags that duplicate the top header
    // e.g. <h1 class="text-2xl font-bold">Manage Hero Banners</h1>
    content = content.replace(/<h1[^>]*>.*?<\/h1>/, '');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
}
console.log("All done!");
