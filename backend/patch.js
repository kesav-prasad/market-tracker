const fs = require('fs');
const path = 'src/routes/api.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /res\.status\(500\)\.json\(\{ success: false, error: error\.message \}\);/,
  "res.status(500).json({ success: false, error: error.message, stack: error.stack });"
);

fs.writeFileSync(path, code);
