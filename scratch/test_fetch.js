const http = require('http');

const urls = [
    'http://localhost:3000/admin/js/sidebar.js',
    'http://localhost:3000/admin/index.html'
];

function testUrl(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            console.log(`${url} -> Status: ${res.statusCode}`);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Length: ${data.length} bytes`);
                if (res.statusCode === 200) {
                    console.log(`Preview: ${data.substring(0, 100)}...`);
                }
                resolve();
            });
        }).on('error', (err) => {
            console.error(`Error fetching ${url}:`, err.message);
            resolve();
        });
    });
}

async function run() {
    for (const url of urls) {
        await testUrl(url);
    }
}

run();
