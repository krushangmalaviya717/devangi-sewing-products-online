const http = require('http');

http.get('http://localhost:3000/api/user/1/orders', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log("STATUS:", res.statusCode);
        console.log("DATA:", data);
    });
}).on('error', (err) => {
    console.error("ERROR:", err.message);
});
