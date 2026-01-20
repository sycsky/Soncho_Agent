const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const enPath = path.join(localesDir, 'en.json');
// We read en.json as raw string to preserve order if we were doing manual parsing,
// but JSON.parse/stringify usually preserves insertion order for string keys.
// To be safe, we will traverse enData keys and build new objects.
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

function alignObject(template, target) {
    const newObj = {};
    for (const key in template) {
        if (Object.prototype.hasOwnProperty.call(template, key)) {
            const tVal = template[key];
            const isTObj = typeof tVal === 'object' && tVal !== null && !Array.isArray(tVal);
            
            if (isTObj) {
                // Template is object
                const targetVal = target && target[key];
                const isTargetObj = typeof targetVal === 'object' && targetVal !== null && !Array.isArray(targetVal);
                
                // If target has this key and is object, align recursively
                if (targetVal !== undefined && isTargetObj) {
                    newObj[key] = alignObject(tVal, targetVal);
                } else {
                    // Target missing or mismatch type -> copy structure from template (filling with template values if needed or empty)
                    // User requirement: "align... missing keys... fill" (implied from previous context)
                    // We will fill with English structure/values to ensure valid file
                    newObj[key] = alignObject(tVal, {}); // recurse with empty target to fill with defaults
                }
            } else {
                // Template is primitive
                if (target && Object.prototype.hasOwnProperty.call(target, key)) {
                    newObj[key] = target[key];
                } else {
                    // Missing in target -> use template value (English)
                    newObj[key] = tVal;
                }
            }
        }
    }
    return newObj;
}

files.forEach(file => {
    const filePath = path.join(localesDir, file);
    const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Rebuild targetData using enData's order
    const alignedData = alignObject(enData, targetData);
    
    fs.writeFileSync(filePath, JSON.stringify(alignedData, null, 2) + '\n', 'utf8');
    console.log(`Aligned ${file}`);
});
