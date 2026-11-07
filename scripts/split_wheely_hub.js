const fs = require('fs');
const path = require('path');

const srcSvgPath = path.join(__dirname, '..', 'assets', 'works', 'mobileapp', 'Wheely Hub.svg');
const originalSvg = fs.readFileSync(srcSvgPath, 'utf8');

// The 6 phone definitions
const phones = [
  { id: 1, name: 'wheely_hub_1.svg', viewBox: '-6 -6 430 910', title: 'Wheely Hub - Screen 1' },
  { id: 2, name: 'wheely_hub_2.svg', viewBox: '525 -6 430 910', title: 'Wheely Hub - Screen 2' },
  { id: 3, name: 'wheely_hub_3.svg', viewBox: '1056 -6 430 910', title: 'Wheely Hub - Screen 3' },
  { id: 4, name: 'wheely_hub_4.svg', viewBox: '-6 969 430 910', title: 'Wheely Hub - Screen 4' },
  { id: 5, name: 'wheely_hub_5.svg', viewBox: '525 969 430 910', title: 'Wheely Hub - Screen 5' },
  { id: 6, name: 'wheely_hub_6.svg', viewBox: '1056 969 430 910', title: 'Wheely Hub - Screen 6' }
];

const destDirs = [
  path.join(__dirname, '..', 'assets', 'works', 'mobileapp'),
  path.join(__dirname, '..', 'works images', 'moblieapp'),
  path.join(__dirname, '..', 'dist', 'assets', 'works', 'mobileapp'),
  path.join(__dirname, '..', 'dist', 'works images', 'moblieapp')
];

destDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

phones.forEach(phone => {
  // Replace the opening <svg ...> tag with custom width, height, and viewBox
  const newSvg = originalSvg.replace(
    /<svg\s+width="1511"\s+height="2109"\s+viewBox="0 0 1511 2109"/,
    `<svg width="430" height="910" viewBox="${phone.viewBox}"`
  );

  destDirs.forEach(dir => {
    const outPath = path.join(dir, phone.name);
    fs.writeFileSync(outPath, newSvg, 'utf8');
  });

  console.log(`Created ${phone.name} with viewBox ${phone.viewBox}`);
});

console.log('Successfully generated all 6 Wheely Hub single images!');
