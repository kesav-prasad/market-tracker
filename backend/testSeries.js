const fs = require('fs');
const parse = require('csv-parse/sync').parse;
const content = fs.readFileSync('../PANGU MKT - SERIES.csv', 'utf8');
const records = parse(content, { skip_empty_lines: true });
console.log('Total instruments:', records.length - 1);
const headers = records[0];
const dataHeaders = headers.slice(9, 30);
console.log('Date columns:', dataHeaders);
