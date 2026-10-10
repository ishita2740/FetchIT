const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'app', 'api');

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

const routes = walkDir(apiDir).filter(f => !f.includes('[...path]'));

let updated = 0;
for (const routePath of routes) {
  let content = fs.readFileSync(routePath, 'utf8');
  
  if (!content.includes('auth.getSession()')) continue;
  
  // Add import if not present
  if (!content.includes('getSessionUser')) {
    content = content.replace(
      'import { auth } from "@/lib/auth/server";',
      'import { auth } from "@/lib/auth/server";\nimport { getSessionUser } from "@/lib/auth/get-session";'
    );
  }
  
  // Replace pattern: const { data: session } = await auth.getSession();
  content = content.replace(
    /const \{ data: session \} = await auth\.getSession\(\);/g,
    'const sessionUser = await getSessionUser();'
  );
  
  // Replace: if (!session?.user) {
  content = content.replace(
    /if \(!session\?\.user\) \{/g,
    'if (!sessionUser) {'
  );
  
  // Replace: session.user.id
  content = content.replace(/session\.user\.id/g, 'sessionUser.id');
  
  // Replace: session.user.email  
  content = content.replace(/session\.user\.email/g, 'sessionUser.email');

  fs.writeFileSync(routePath, content, 'utf8');
  console.log('Updated:', path.relative(process.cwd(), routePath));
  updated++;
}

console.log(`\nDone. Updated ${updated} routes.`);
