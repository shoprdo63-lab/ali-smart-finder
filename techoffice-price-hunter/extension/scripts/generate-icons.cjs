const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

// Create a simple 1x1 purple PNG for each size
sizes.forEach(size => {
  const fileName = `icon-${size}.png`;
  const filePath = path.join(iconsDir, fileName);
  
  // Minimal valid PNG (1x1 purple pixel)
  const pngBuffer = Buffer.from(
    '89504E470D0A1A0A0000000D4948445200000001000000010802000000907753DE0000000D4944415418D363F8F3F3C3C3C3000004A00013A1C5B0A0000000049454E44AE426082', 
    'hex'
  );
  
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Created ${fileName}`);
});

console.log('Icons generated successfully');
