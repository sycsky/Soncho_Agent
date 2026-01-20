# i18n Management Scripts

This directory contains scripts to manage and validate internationalization (i18n) files in `../locales`.

## Recommended Workflow (Strict Order)

1. **Modify `en.json`**: Add, remove, or update keys in the master English file.
2. **Check for Duplicates**: Ensure `en.json` is valid.
   ```bash
   node ai_agent_web/i18n/scripts/check_duplicates.cjs
   ```
3. **Align Keys (CRITICAL)**: Propagate structure changes to all other language files. This will **fill missing keys with English values**.
   ```bash
   node ai_agent_web/i18n/scripts/align_keys.cjs
   ```
4. **Check Untranslated**: Identify keys that need translation (because they were filled with English in step 3).
   ```bash
   node ai_agent_web/i18n/scripts/check_untranslated.cjs
   ```
   > **Note:** You must run `align_keys.cjs` *before* this script to ensure all keys exist. This script detects where the value in a target language file is identical to the English value.

## Scripts Reference

### 1. Align Keys (Fix Order & Missing)
Re-writes all non-English locale files to match the exact key order and structure of `en.json`.
- **Adds missing keys** (filled with English value).
- **Removes extra keys** (not present in `en.json`).
- **Sorts keys** to match `en.json` line-by-line order.
```bash
node ai_agent_web/i18n/scripts/align_keys.cjs
```

### 2. Check for Untranslated Content
Checks if other language files contain values identical to English.
- Useful after running `align_keys.cjs` to find newly added keys that are still in English.
```bash
node ai_agent_web/i18n/scripts/check_untranslated.cjs
```

### 3. Check for Missing Keys
Checks if any keys present in `en.json` are missing in other language files.
- Should return no results if `align_keys.cjs` was run successfully.
```bash
node ai_agent_web/i18n/scripts/check_missing.cjs
```

### 4. Check for Duplicate Keys
Checks `en.json` for duplicate keys within the same scope.
```bash
node ai_agent_web/i18n/scripts/check_duplicates.cjs
```
