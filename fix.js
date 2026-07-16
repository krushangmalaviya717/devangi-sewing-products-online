const fs = require('fs');

function fixFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    // Replace \` with `
    content = content.replace(/\\`/g, '`');
    // Replace \$ with $
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(path, content);
}

fixFile('admin/farma-builder.html');
fixFile('admin/custom-orders.html');
fixFile('customize-farma.html');
