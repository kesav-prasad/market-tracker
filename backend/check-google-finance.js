const https = require('https');
https.get('https://www.google.com/finance/quote/SENSEXBETA:NSE', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const match = data.match(/<div class="YMlKec fxKbKc">([^<]+)<\/div>/);
    if (match) console.log("Google Finance SENSEXBETA price:", match[1]);
    else console.log("Price not found on Google Finance page.");
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
