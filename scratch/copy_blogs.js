const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\OMEN\\.gemini\\antigravity\\brain\\fd746013-3130-4e78-8551-9b719462f12e';
const destDir = 'E:\\website\\devangi-sewing-products-online\\assets\\images';

const files = [
    { src: 'sewing_blog_1_1782592106761.png', dest: 'blog-1.png' },
    { src: 'sewing_blog_2_1782592116201.png', dest: 'blog-2.png' },
    { src: 'sewing_blog_3_1782592126446.png', dest: 'blog-3.png' },
    { src: 'sewing_blog_4_1782592139031.png', dest: 'blog-4.png' }
];

files.forEach(f => {
    const srcPath = path.join(srcDir, f.src);
    const destPath = path.join(destDir, f.dest);
    try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${f.src} to ${f.dest}`);
    } catch (err) {
        console.error(`Error copying ${f.src}:`, err);
    }
});
