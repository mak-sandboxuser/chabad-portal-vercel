require('dotenv').config({ path: __dirname + '/.env' });
const https = require('https');
const { parseMakePayload, extractPortalDataFromPayload } = require('./portalDataMapper');

function fetchMake(url, body) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);
    const payload = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const req = https.request(parsedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const webhookUrl = process.env.MAKE_PAYMENTS_WEBHOOK_URL || process.env.MAKE_PORTAL_DATA_WEBHOOK_URL;
  const rawStr = await fetchMake(webhookUrl, {
    email: 'test35@gmail.com',
    fetchPayments: true,
    fetchFinancials: true,
    fetchPledges: true,
    fetchRecurring: true,
    fetchPortal: true,
  });

  const payload = parseMakePayload(rawStr);
  const portal = extractPortalDataFromPayload(payload);

  console.log('--- TEST35@GMAIL.COM LATEST PAYMENTS ---');
  console.log('Total Payments:', portal.payments.length);
  console.log('Payments Details:', JSON.stringify(portal.payments, null, 2));

  console.log('\n--- TEST35@GMAIL.COM LATEST PLEDGES ---');
  console.log('Total Pledges:', portal.pledges.length);
  if (portal.pledges.length) {
    console.log('First 3 Pledges:', JSON.stringify(portal.pledges.slice(0, 3), null, 2));
  }
}

main().catch(console.error);
