const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const enPath = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

function findMissing(enObj, targetObj, pathPrefix = '', results = []) {
    for (const key in enObj) {
        if (Object.prototype.hasOwnProperty.call(enObj, key)) {
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            const enValue = enObj[key];
            
            if (targetObj === undefined || !Object.prototype.hasOwnProperty.call(targetObj, key)) {
                results.push(currentPath);
                continue;
            }

            const targetValue = targetObj[key];

            if (typeof enValue === 'object' && enValue !== null && !Array.isArray(enValue)) {
                // If target is not an object (mismatch type), treat as missing children/mismatch
                if (typeof targetValue !== 'object' || targetValue === null || Array.isArray(targetValue)) {
                    // Type mismatch is a kind of missing structure
                    // We can just flag the object key itself or recurse? 
                    // Let's recurse but target is effectively undefined for children
                    findMissing(enValue, {}, currentPath, results);
                } else {
                    findMissing(enValue, targetValue, currentPath, results);
                }
            }
        }
    }
    return results;
}

console.log('--- Checking for missing keys (vs en.json) ---');
let hasIssues = false;
files.forEach(file => {
    const filePath = path.join(localesDir, file);
    const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missing = findMissing(enData, targetData);

    if (missing.length > 0) {
        console.log(`\n[${file}] Missing keys (${missing.length}):`);
        missing.slice(0, 10).forEach(key => {
            console.log(`  - ${key}`);
        });
        if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more.`);
        hasIssues = true;
    }
});

if (!hasIssues) {
    console.log('No missing keys found.');
}
