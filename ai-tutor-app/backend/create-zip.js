const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const output = fs.createWriteStream('lambda-code.zip');
const archive = archiver('zip', { zlib: { level: 6 } });

archive.pipe(output);

// Add directories
console.log('Adding dist directory...');
archive.directory('dist/', 'dist/');

console.log('Adding node_modules directory...');
archive.glob('node_modules/**', {
  ignore: [
    'node_modules/.bin/**',
    'node_modules/*/test/**',
    'node_modules/*/.git/**',
    'node_modules/*/.gitignore',
    'node_modules/*/.npmignore',
    'node_modules/*/.*'
  ]
});

archive.finalize();

output.on('close', () => {
  const size = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`Zip created successfully: ${size} MB`);
});

archive.on('error', (err) => {
  console.error('Archive error:', err);
  process.exit(1);
});
