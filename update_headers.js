const fs = require('fs');
const files = ['shop.html', 'product.html'];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(
        /<div class="header-main">\s*<div class="container">/,
        `<div class="header-main">\n      <div class="container flex-mobile-header">\n\n        <button class="action-btn mobile-menu-btn" data-mobile-menu-open-btn>\n          <ion-icon name="menu-outline"></ion-icon>\n        </button>\n`
    );
    fs.writeFileSync(f, content);
});
console.log('Headers updated.');
