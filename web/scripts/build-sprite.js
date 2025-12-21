#!/usr/bin/env node
/**
 * SVG Sprite Generator
 * Combines all SVG icons in /icons folder into a single sprite.svg
 * Run: node scripts/build-sprite.js
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../icons');
const OUTPUT_FILE = path.join(ICONS_DIR, 'sprite.svg');

// Get all SVG files
const svgFiles = fs.readdirSync(ICONS_DIR)
    .filter(f => f.endsWith('.svg') && f !== 'sprite.svg')
    .sort();

console.log(`Found ${svgFiles.length} SVG files`);

// Start building sprite
let symbols = '';

svgFiles.forEach(file => {
    const id = path.basename(file, '.svg');
    const content = fs.readFileSync(path.join(ICONS_DIR, file), 'utf8');
    
    // Extract viewBox from original SVG
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 48 48';
    
    // Extract inner content (everything between <svg> and </svg>)
    const innerMatch = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    const inner = innerMatch ? innerMatch[1].trim() : '';
    
    if (inner) {
        symbols += `  <symbol id="${id}" viewBox="${viewBox}">\n    ${inner}\n  </symbol>\n`;
        console.log(`  ✓ ${id}`);
    } else {
        console.log(`  ✗ ${id} (empty or invalid)`);
    }
});

// Create sprite file
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${symbols}</svg>
`;

fs.writeFileSync(OUTPUT_FILE, sprite);
console.log(`\n✅ Created ${OUTPUT_FILE} with ${svgFiles.length} icons`);
