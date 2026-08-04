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
  const raw = await fetchMake(webhookUrl, {
    email: 'test32@gmail.com',
    fetchPayments: true,
    fetchFinancials: true,
    fetchPledges: true,
    fetchRecurring: true,
    fetchPortal: true,
  });

  const payload = parseMakePayload(raw);
  const portal = extractPortalDataFromPayload(payload);

  console.log('Total Pledges:', portal.pledges.length);
  portal.pledges.forEach((p, index) => {
    console.log(`Pledge ${index+1}: id=${p.id}, name=${p.name}, purpose=${p.purpose}, type=${p.type}, date=${p.date}, total=${p.total}, paid=${p.paid}, outstanding=${p.outstanding}, status=${p.status}`);
  });
}

main().catch(console.error);
