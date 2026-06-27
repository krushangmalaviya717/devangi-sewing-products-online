const fs = require('fs');
const path = require('path');
const adminDir = path.join('e:', 'website', 'Devangi Products', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

for (const file of files) {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove the Admin Panel span
    const targetString = '<span class="font-bold text-lg text-gray-900 tracking-tight">Admin Panel</span>';
    
    if (content.includes(targetString)) {
        content = content.replace(targetString, '');
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Removed from ' + file);
    } else {
        console.log('Not found in ' + file);
    }
}
console.log('Done removing Admin Panel text');
