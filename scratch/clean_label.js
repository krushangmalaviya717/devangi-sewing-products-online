const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'admin', 'js', 'admin.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find end of printCourierLabel4up function - look for closing } after showToast label line
const marker = 'Label print window opened!';
const showToastIdx = content.indexOf(marker);
if (showToastIdx < 0) { console.log('Marker not found!'); process.exit(1); }

// Find the closing } of printCourierLabel4up (next } after showToast line's ;)
const semiAfterToast = content.indexOf(';', showToastIdx);
const closingBrace = content.indexOf('\n}', semiAfterToast);
const endOfNewFunc = closingBrace + 2; // include the \n}

// Find start of fetchCustomerStats
const fetchStart = content.indexOf('\nasync function fetchCustomerStats');
if (fetchStart < 0) { console.log('fetchCustomerStats not found!'); process.exit(1); }

console.log('New func ends at char:', endOfNewFunc);
console.log('fetchCustomerStats starts at char:', fetchStart);
console.log('Dead code between:', endOfNewFunc, 'and', fetchStart);
console.log('Dead code length:', fetchStart - endOfNewFunc, 'chars');

const before = content.substring(0, endOfNewFunc);
const after = content.substring(fetchStart);
const cleaned = before + '\n\n' + after;

fs.writeFileSync(filePath, cleaned, 'utf8');
console.log('Done! File cleaned successfully.');
console.log('New total chars:', cleaned.length);
