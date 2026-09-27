const fs = require('fs');

const homePath = 'd:/antigravity/HashBee/miniapp/src/pages/Home.tsx';
let homeCode = fs.readFileSync(homePath, 'utf8');

homeCode = homeCode.replace(
  /const \{ user, refreshUser, loading \} = useAuth\(\)/,
  `const { user, refreshUser, loading } = useAuth()
  const { t, currentLanguage } = useLanguage()
  const [showLangModal, setShowLangModal] = useState(false)`
);

fs.writeFileSync(homePath, homeCode, 'utf8');
console.log('✅ Home.tsx fixed!');
