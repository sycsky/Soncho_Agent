const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const enPath = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

function findUntranslated(enObj, targetObj, pathPrefix = '', results = []) {
    for (const key in enObj) {
        if (Object.prototype.hasOwnProperty.call(enObj, key)) {
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            const enValue = enObj[key];
            const targetValue = targetObj ? targetObj[key] : undefined;

            if (targetValue === undefined) {
                // Missing key is handled by another script, but effectively it's not translated
                continue;
            }

            if (typeof enValue === 'object' && enValue !== null && !Array.isArray(enValue)) {
                if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
                    findUntranslated(enValue, targetValue, currentPath, results);
                }
            } else {
                // Primitive value check
                // Ignore short codes or common untranslatables if needed, but strict check for now
                if (typeof enValue === 'string' && enValue.trim() !== '' && enValue === targetValue) {
                    // Check if it looks like a real word (regex for letters)
                    if (/[a-zA-Z]/.test(enValue)) {
                        results.push({ path: currentPath, value: enValue });
                    }
                }
            }
        }
    }
    return results;
}

console.log('--- Checking for untranslated content (identical to English) ---');
let hasIssues = false;
files.forEach(file => {
    const filePath = path.join(localesDir, file);
    const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const untranslated = findUntranslated(enData, targetData);

    if (untranslated.length > 0) {
        console.log(`\n[${file}] Potential untranslated keys (${untranslated.length}):`);
        untranslated.forEach(item => {
            console.log(`  - ${item.path}: "${item.value}"`);
        });
        hasIssues = true;
    }
});

if (!hasIssues) {
    console.log('No untranslated content found (no values identical to English).');
}
