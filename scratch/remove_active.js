const fs = require('fs');
const path = require('path');
const adminDir = path.join('e:', 'website', 'devangi sewing products', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

for (const file of files) {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // The Dashboard link is currently hardcoded as active:
    // class="flex items-center px-3 py-2.5 bg-pink-50 text-pink-700 rounded-lg font-semibold transition-colors group"
    // <svg class="w-5 h-5 mr-3 text-pink-500"
    
    const activeClass = 'class="flex items-center px-3 py-2.5 bg-pink-50 text-pink-700 rounded-lg font-semibold transition-colors group"';
    const inactiveClass = 'class="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium group"';
    
    const activeSvg = '<svg class="w-5 h-5 mr-3 text-pink-500"';
    const inactiveSvg = '<svg class="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500 transition-colors"';
    
    let changed = false;
    
    // We only want to remove it from the href="index.html" link
    if (content.includes('href="index.html" ' + activeClass) || content.includes('href="index.html"\n                ' + activeClass)) {
        content = content.replace(activeClass, inactiveClass);
        content = content.replace(activeSvg, inactiveSvg);
        changed = true;
    }
    // Check with different spacing just in case
    else if (content.includes(activeClass)) {
        content = content.replace(activeClass, inactiveClass);
        content = content.replace(activeSvg, inactiveSvg);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Removed hardcoded active from ' + file);
    }
}
console.log('Done');
