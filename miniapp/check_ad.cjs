const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\a49970c2-534e-493b-8329-58857f2ba2fd\\.system_generated\\steps\\2469\\content.md', 'utf8');

if (content.toLowerCase().includes('alert')) {
    console.log('Found alert!');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('alert')) {
            console.log(`Line ${i}: ${lines[i]}`);
        }
    }
} else {
    console.log('No alert found in ad script');
}
