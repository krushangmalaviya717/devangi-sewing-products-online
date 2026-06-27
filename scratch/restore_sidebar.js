const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\OMEN\\.gemini\\antigravity\\brain\\e39515f3-b471-4dea-8298-0cc256025c5e\\.system_generated\\logs\\transcript_full.jsonl';
const targetDest = 'e:\\website\\devangi-sewing-products-online\\admin\\js\\sidebar.js';

if (!fs.existsSync(logPath)) {
    console.error(`Log file not found at ${logPath}`);
    process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
let found = false;

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const data = JSON.parse(line);
        if (data.tool_calls) {
            for (const call of data.tool_calls) {
                if (call.name === 'write_to_file' && call.args && call.args.TargetFile && call.args.TargetFile.includes('sidebar.js')) {
                    // Extract code content
                    let code = call.args.CodeContent;
                    // It might be double JSON encoded or escaped
                    if (code.startsWith('"') && code.endsWith('"')) {
                        // Unescape the string
                        code = JSON.parse(code);
                    }
                    
                    // Create destination dir if not exists
                    fs.mkdirSync(path.dirname(targetDest), { recursive: true });
                    fs.writeFileSync(targetDest, code, 'utf8');
                    console.log(`Successfully restored sidebar.js to ${targetDest}!`);
                    found = true;
                    break;
                }
            }
        }
        if (found) break;
    } catch (e) {
        // Skip malformed lines
    }
}

if (!found) {
    console.error('Could not find sidebar.js write_to_file call in logs.');
}
