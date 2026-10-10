const fs = require('fs');

const files = [
  'app/api/upload/route.ts',
  'app/api/saved-documents/route.ts',
  'app/api/saved-charts/route.ts',
  'app/api/profile/route.ts',
  'app/api/feedback/route.ts',
  'app/api/documents/route.ts',
  'app/api/analyze-image/route.ts',
  'app/api/analyze-document/route.ts',
];

const importStr = 'import { auth } from "@/lib/auth/server";';
const newImport = importStr + '\nimport { getSessionUser } from "@/lib/auth/get-session";';

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const hasImport = content.includes('@/lib/auth/get-session');
  const hasUsage = content.includes('getSessionUser');
  
  if (hasUsage && !hasImport) {
    const fixed = content.replace(importStr, newImport);
    fs.writeFileSync(f, fixed, 'utf8');
    console.log('Fixed import in:', f);
  } else if (hasUsage && hasImport) {
    console.log('OK:', f);
  } else {
    console.log('No getSessionUser found in:', f);
  }
}
