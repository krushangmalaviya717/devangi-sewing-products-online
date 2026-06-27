const fs = require('fs');
const path = require('path');

const dir = 'e:\\website\\devangi-sewing-products-online';
const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const replacements = [
    {
        // Social list item: <li><a href="#" class="social-link"><ion-icon name="logo-***"></ion-icon></a></li>
        regex: /<li>\s*<a href="#" class="(social-link|footer-nav-link)">\s*<ion-icon name="logo-[a-z]+"><\/ion-icon>\s*<\/a>\s*<\/li>/g,
        replace: ''
    },
    {
        // Footer social list item
        regex: /<li class="footer-nav-item">\s*<a href="#" class="footer-nav-link">\s*<ion-icon name="logo-[a-z]+"><\/ion-icon>\s*<\/a>\s*<\/li>/g,
        replace: ''
    },
    {
        // Or sometimes it's just <a href="#" class="social-link">...</a> without li
        regex: /<a href="#" class="social-link">\s*<ion-icon name="logo-[a-z]+"><\/ion-icon>\s*<\/a>/g,
        replace: ''
    },
    {
        // specific ion-icon without link
        regex: /<ion-icon name="logo-(facebook|twitter|instagram|linkedin)"><\/ion-icon>/g,
        replace: ''
    },
    {
        regex: /placeholder="John Doe"/g,
        replace: 'placeholder="Your Full Name"'
    },
    {
        regex: /placeholder="you@example.com"/g,
        replace: 'placeholder="yourname@gmail.com"'
    },
    {
        regex: /placeholder="name@example.com"/g,
        replace: 'placeholder="yourname@gmail.com"'
    },
    {
        regex: />email@example.com</g,
        replace: '>yourname@gmail.com<'
    }
];

htmlFiles.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    
    replacements.forEach(r => {
        content = content.replace(r.regex, r.replace);
    });
    
    // Check if there are empty ul containers
    content = content.replace(/<ul class="(header-social-container|menu-social-container|footer-social-list)">\s*<\/ul>/g, '');
    
    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
