const fs = require('fs');
const path = require('path');

const adminDir = 'e:\\website\\devangi-sewing-products-online\\admin';

if (!fs.existsSync(adminDir)) {
    console.error(`Admin directory not found at ${adminDir}`);
    process.exit(1);
}

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if the script tag itself is already included (either as /admin/js/sidebar.js or js/sidebar.js)
    const hasScriptTag = content.includes('src="/admin/js/sidebar.js"') || content.includes('src="js/sidebar.js"');

    if (!hasScriptTag) {
        console.log(`Missing sidebar script tag in: ${file}`);

        // We want to insert the script tag before the page's main JS script tag
        // Usually: <script src="/admin/js/admin.js"></script>
        // Or for user_details.html: <script src="/admin/js/user_details.js"></script>
        // Or for contact.html: <script src="/admin/js/contact.js"></script>
        
        let targetScript = '';
        if (content.includes('src="/admin/js/admin.js"')) {
            targetScript = 'src="/admin/js/admin.js"';
        } else if (content.includes('src="/admin/js/user_details.js"')) {
            targetScript = 'src="/admin/js/user_details.js"';
        } else if (content.includes('src="/admin/js/contact.js"')) {
            targetScript = 'src="/admin/js/contact.js"';
        } else if (content.includes('src="js/admin.js"')) {
            targetScript = 'src="js/admin.js"';
        }

        if (targetScript) {
            // Find the tag containing targetScript
            const pattern = new RegExp(`<script[^>]*${targetScript}[^>]*><\\/script>`);
            const match = content.match(pattern);
            if (match) {
                const scriptTag = match[0];
                const replacement = `<script src="/admin/js/sidebar.js"></script>\n    ${scriptTag}`;
                content = content.replace(scriptTag, replacement);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Successfully injected sidebar.js script tag in ${file}`);
            } else {
                console.log(`Found script source but could not match full script tag in ${file}`);
            }
        } else {
            // Fallback: insert before </body>
            if (content.includes('</body>')) {
                content = content.replace('</body>', '    <script src="/admin/js/sidebar.js"></script>\n</body>');
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Injected before body close tag in ${file}`);
            } else {
                console.log(`Could not find suitable insertion point in ${file}`);
            }
        }
    } else {
        console.log(`Already has sidebar script tag: ${file}`);
    }
});
