const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../i18n/locales');
const enPath = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

function prune(target, source) {
    let modified = false;
    for (const key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) {
                // Key in target but not in source -> delete
                delete target[key];
                modified = true;
            } else {
                // Key in both. Check if object.
                const targetValue = target[key];
                const sourceValue = source[key];
                const isTargetObj = typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue);
                const isSourceObj = typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue);

                if (isTargetObj && isSourceObj) {
                    if (prune(targetValue, sourceValue)) {
                        modified = true;
                    }
                } else if (isTargetObj !== isSourceObj) {
                    // Type mismatch. Force sync to source structure by deleting target.
                    // deepMerge will fill it in later.
                    delete target[key];
                    modified = true;
                }
            }
        }
    }
    return modified;
}

function deepMerge(target, source) {
    let modified = false;
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const isSourceObj = typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue);

            if (isSourceObj) {
                if (!target[key] || typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
                    target[key] = {};
                    modified = true;
                }
                if (deepMerge(target[key], sourceValue)) {
                    modified = true;
                }
            } else {
                if (!Object.prototype.hasOwnProperty.call(target, key)) {
                    target[key] = sourceValue;
                    modified = true;
                }
            }
        }
    }
    return modified;
}

files.forEach(file => {
    const filePath = path.join(localesDir, file);
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    if (prune(data, enData)) {
        changed = true;
    }
    if (deepMerge(data, enData)) {
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`No changes for ${file}`);
    }
});
