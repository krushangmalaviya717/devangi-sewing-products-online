const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'admin', 'js', 'admin.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the end of the NEW printCourierLabel4up (the first showToast with 'Label ready!')
const newEnd = content.indexOf("showToast('Label ready! 🏷️ Click Print in the popup window.');");
if (newEnd < 0) { console.log('NEW end marker not found!'); process.exit(1); }

// Find the closing } after that
const closingBrace = content.indexOf('\n}', newEnd);
const endOfNewFunc = closingBrace + 2;

// Find the OLD code start (the leftover fragment)
const oldStartMarker = "\n    // ── Fill the hidden data holder (needed for barcode JS to run)\n    const awbNum = 'DSP'";
const oldStart = content.indexOf(oldStartMarker, endOfNewFunc - 5);
if (oldStart < 0) { console.log('OLD start marker not found!'); process.exit(1); }

// Find the end of the OLD function (closing } before fetchCustomerStats)
const fetchStart = content.indexOf('\nasync function fetchCustomerStats');
if (fetchStart < 0) { console.log('fetchCustomerStats not found!'); process.exit(1); }

console.log('New func ends at:', endOfNewFunc);
console.log('Old code starts at:', oldStart);
console.log('fetchCustomerStats at:', fetchStart);
console.log('Old dead code length:', fetchStart - oldStart, 'chars');

const before = content.substring(0, endOfNewFunc);
const after = content.substring(fetchStart);
const cleaned = before + '\n\n' + after;

fs.writeFileSync(filePath, cleaned, 'utf8');
console.log('Done! File cleaned. New size:', cleaned.length, 'chars');
