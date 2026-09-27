const fs = require('fs');

const withPath = 'd:/antigravity/HashBee/miniapp/src/pages/Withdraw.tsx';
let withCode = fs.readFileSync(withPath, 'utf8');

withCode = withCode.replace(
  /\{selectedCrypto === 'USDT_BSC' \? 'USDT BSC \(BEP-20\) Address' : 'GRAM \{t\('destination_wallet', 'Wallet Address'\)\}'\}/,
  `{selectedCrypto === 'USDT_BSC' ? 'USDT BSC (BEP-20) Address' : 'GRAM ' + t('destination_wallet', 'Wallet Address')}`
);

fs.writeFileSync(withPath, withCode, 'utf8');
console.log('✅ Withdraw.tsx string nesting fixed!');
