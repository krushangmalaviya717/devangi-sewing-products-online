const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const files = ['index.html', 'product.html', 'shop.html', 'contact.html'];

files.forEach(file => {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace padding: 0 10px 40px; with padding: 0 16px 40px;
    if (content.includes('padding: 0 10px 40px;')) {
        content = content.replace(/padding: 0 10px 40px;/g, 'padding: 0 16px 40px;');
        fs.writeFileSync(filePath, content);
        console.log(`Updated padding in ${file}`);
    } else {
        console.log(`String not found in ${file}`);
    }
});
