const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');

const csvPath = path.join(__dirname, '../../year sheet.csv');
const fileContent = fs.readFileSync(csvPath, 'utf8');

const records = parse(fileContent, {
  skip_empty_lines: true,
  relax_column_count: true
});

console.log(records[0]);
console.log(records[1]);
