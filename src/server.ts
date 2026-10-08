// Universal server entrypoint
// Handles both 'node src/server.ts' (Render default start command)
// and 'npm start' / 'node dist/server.js' without crashing Node.js ESM loader.
const path = require('path');
const fs = require('fs');

const compiledApp = path.resolve(__dirname, '..', 'dist', 'app.js');
const localApp = path.resolve(__dirname, 'app');

if (fs.existsSync(compiledApp)) {
  require(compiledApp);
} else {
  require(localApp);
}
