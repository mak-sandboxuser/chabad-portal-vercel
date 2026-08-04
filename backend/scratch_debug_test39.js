require('dotenv').config({ path: __dirname + '/.env' });
const https = require('https');

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
  const { parseMakePayload, extractPortalDataFromPayload } = require('./portalDataMapper');
  const { getPledges, getMembership } = await import('../frontend/src/utils/portalData.js');

  const webhookUrl = process.env.MAKE_PAYMENTS_WEBHOOK_URL || process.env.MAKE_PORTAL_DATA_WEBHOOK_URL;
  const rawStr = await fetchMake(webhookUrl, {
    email: 'test39@gmail.com',
    fetchPayments: true,
    fetchFinancials: true,
    fetchPledges: true,
    fetchRecurring: true,
    fetchPortal: true,
  });

  const payload = parseMakePayload(rawStr);
  const portalData = extractPortalDataFromPayload(payload);

  console.log('--- TEST39 DATA ---');
  console.log('membership:', portalData.membership);
  console.log('recurring:', portalData.recurring);
  console.log('payments:', portalData.payments);
  console.log('pledges:', portalData.pledges);

  const pledges = getPledges(portalData);
  const membership = getMembership(portalData);
  console.log('\ngetPledges:', pledges);
  console.log('\ngetMembership:', membership);
}

main().catch(console.error);
