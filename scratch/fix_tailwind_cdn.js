const fs = require('fs');
const path = require('path');

const directoryPath = 'e:\\website\\devangi sewing products';

function replaceInFile(filePath) {
    if (filePath.includes('node_modules') || filePath.includes('.git')) return;
    
    if (fs.statSync(filePath).isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const file of files) {
            replaceInFile(path.join(filePath, file));
        }
    } else if (filePath.endsWith('.html')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        if (content.includes('https://cdn.tailwindcss.com')) {
            content = content.replace(/https:\/\/cdn\.tailwindcss\.com\/?/g, '/assets/js/tailwindcss.js');
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
}

replaceInFile(directoryPath);
console.log('Done replacing Tailwind CDN.');
