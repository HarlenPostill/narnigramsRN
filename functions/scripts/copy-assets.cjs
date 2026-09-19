const fs = require('node:fs');
fs.mkdirSync('dist/assets', {recursive:true});
fs.copyFileSync('../assets/words.txt', 'dist/assets/words.txt');
fs.copyFileSync('../assets/wordlist-notice.json', 'dist/assets/wordlist-notice.json');
