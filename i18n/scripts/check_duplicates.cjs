const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const enPath = path.join(localesDir, 'en.json');
const enContent = fs.readFileSync(enPath, 'utf8');

// A simple regex-based duplicate key checker for JSON source
// It tracks nesting level by counting braces.
// This is not a full parser but catches strict format duplicates.

function findDuplicates(jsonString) {
    const lines = jsonString.split('\n');
    const duplicates = [];
    const keysAtLevel = new Map(); // level -> Set(keys)
    let currentLevel = 0;

    const keyRegex = /"([^"]+)"\s*:/;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Naive level tracking
        // This assumes standard formatting where { and } change levels
        // It might fail on strings containing { or } but for locale files it's usually safe
        
        // Count opening braces that are not in strings? 
        // Doing this properly requires a state machine.
        // Let's use a simpler heuristic for indented JSON: indentation level.
        
        // Measure indentation
        const matchIndent = line.match(/^(\s*)/);
        const indent = matchIndent ? matchIndent[1].length : 0;
        
        // Map indentation to "scope ID". 
        // Actually, let's try a strict token scan approach.
    });
    
    // Better approach: regex global match on the whole file?
    // No, we need scope.
    
    // Alternative: Use a library-less parser that just throws on duplicate.
    // We can write a recursive descent parser for JSON keys.
    
    let pos = 0;
    const len = jsonString.length;
    const duplicatesFound = [];
    
    function parseValue() {
        skipWhitespace();
        const char = jsonString[pos];
        if (char === '{') {
            parseObject();
        } else if (char === '[') {
            parseArray();
        } else if (char === '"') {
            parseString();
        } else {
            // number, true, false, null - skip until , or } or ]
            while (pos < len && ',}]'.indexOf(jsonString[pos]) === -1) {
                pos++;
            }
        }
    }

    function parseObject() {
        pos++; // skip {
        const keys = new Set();
        
        while (pos < len) {
            skipWhitespace();
            if (jsonString[pos] === '}') {
                pos++;
                return;
            }
            
            // Expect string key
            if (jsonString[pos] !== '"') {
                 // Malformed or empty object ended with something else?
                 // Just advance
                 pos++; 
                 continue;
            }
            
            const key = parseString(true); // true = return value
            skipWhitespace();
            
            if (jsonString[pos] !== ':') {
                // error, skip
            } else {
                pos++; // skip :
            }

            if (keys.has(key)) {
                duplicatesFound.push(key);
            } else {
                keys.add(key);
            }
            
            parseValue();
            
            skipWhitespace();
            if (jsonString[pos] === ',') {
                pos++;
            }
        }
    }

    function parseArray() {
        pos++; // skip [
        while (pos < len) {
            skipWhitespace();
            if (jsonString[pos] === ']') {
                pos++;
                return;
            }
            parseValue();
            skipWhitespace();
            if (jsonString[pos] === ',') {
                pos++;
            }
        }
    }

    function parseString(ret = false) {
        pos++; // skip "
        let start = pos;
        let val = '';
        while (pos < len) {
            if (jsonString[pos] === '\\') {
                pos += 2; // skip escaped char
            } else if (jsonString[pos] === '"') {
                if (ret) val = jsonString.substring(start, pos);
                pos++;
                return val;
            } else {
                pos++;
            }
        }
        return '';
    }

    function skipWhitespace() {
        while (pos < len && /\s/.test(jsonString[pos])) {
            pos++;
        }
    }

    try {
        parseValue(); // Start parsing root
    } catch (e) {
        console.error("Error parsing JSON structure:", e);
    }
    
    return duplicatesFound;
}

console.log('--- Checking for duplicate keys in en.json ---');
const dupes = findDuplicates(enContent);

if (dupes.length > 0) {
    console.log(`Found ${dupes.length} duplicate keys (note: simple parser, verify manually):`);
    dupes.forEach(k => console.log(`  - "${k}"`));
} else {
    console.log('No duplicate keys found.');
}
