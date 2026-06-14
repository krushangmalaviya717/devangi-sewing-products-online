const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const linkToAdd = `
                <a href="contact.html" id="nav-contact" class="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg nav-btn">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    Contact Settings
                </a>`;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.includes('id="nav-contact"')) {
        console.log(`Already has nav-contact: ${file}`);
        return;
    }
    
    const insertPoint = `id="nav-orders"`;
    if (content.includes(insertPoint)) {
        const orderIndex = content.indexOf(insertPoint);
        const endOfA = content.indexOf('</a>', orderIndex) + 4;
        
        content = content.slice(0, endOfA) + linkToAdd + content.slice(endOfA);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`Could not find nav-orders in ${file}`);
    }
});
