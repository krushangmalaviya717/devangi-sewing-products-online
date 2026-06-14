const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../checkout.html');
let content = fs.readFileSync(file, 'utf8');

// 1. Update layout spacings
content = content.replace('py-10 max-w-5xl', 'py-6 max-w-5xl');
content = content.replace('gap-10', 'gap-6');
content = content.replace('space-y-8', 'space-y-5');

// 2. Update section paddings and corners
content = content.replace(/p-8/g, 'p-5');
content = content.replace(/rounded-2xl/g, 'rounded-xl');

// 3. Form input padding and corners
content = content.replace(/px-4 py-3 rounded-xl/g, 'px-3 py-2 rounded-lg');
content = content.replace(/px-4 py-2\.5 rounded-xl/g, 'px-3 py-2 rounded-lg');

// 4. Address card paddings and corners
content = content.replace(/border-2 border-gray-100 rounded-xl p-4/g, 'border border-gray-200 rounded-lg p-3');

// 5. Payment card paddings and corners
content = content.replace(/border-2 border-gray-100 rounded-2xl p-5/g, 'border border-gray-200 rounded-lg p-4');

// 6. Right side order summary spacing
content = content.replace(/p-6 sticky top-24/g, 'p-5 sticky top-24');
content = content.replace(/mt-8/g, 'mt-5');
content = content.replace(/py-4/g, 'py-3');

fs.writeFileSync(file, content);
console.log('checkout.html updated successfully.');
