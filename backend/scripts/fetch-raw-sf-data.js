/**
 * Raw Salesforce data fetch for anu@mailinator.com
 * Calls all 3 relevant Make.com webhooks and logs the RAW responses
 */
require('dotenv').config();

const EMAIL = 'anu@mailinator.com';

async function fetchRaw(label, url, body) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📡 ${label}`);
  console.log(`   URL: ${url}`);
  console.log(`   Body: ${JSON.stringify(body)}`);
  console.log('='.repeat(80));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log(`   Status: ${res.status}`);
    const text = await res.text();
    
    // Try to pretty-print JSON
    try {
      const json = JSON.parse(text);
      console.log(`   Response (JSON):\n${JSON.stringify(json, null, 2)}`);
    } catch {
      console.log(`   Response (Raw Text):\n${text}`);
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
}

async function main() {
  console.log(`\n🔍 Fetching raw Salesforce data for: ${EMAIL}\n`);

  // 1. Member Lookup
  await fetchRaw(
    'WEBHOOK 1: Member Lookup (MAKE_WEBHOOK_URL)',
    process.env.MAKE_WEBHOOK_URL,
    { email: EMAIL }
  );

  // 2. Portal Data
  await fetchRaw(
    'WEBHOOK 2: Portal Data (MAKE_PORTAL_DATA_WEBHOOK_URL)',
    process.env.MAKE_PORTAL_DATA_WEBHOOK_URL,
    {
      email: EMAIL,
      contactId: '003Jx00001eIyhKIAS',
      accountId: '001Jx00001sLcfNIAS',
      fetchPortal: true,
    }
  );

  // 3. Payments/Financials
  await fetchRaw(
    'WEBHOOK 3: Payments/Financials (MAKE_PAYMENTS_WEBHOOK_URL)',
    process.env.MAKE_PAYMENTS_WEBHOOK_URL,
    {
      email: EMAIL,
      contactId: '003Jx00001eIyhKIAS',
      accountId: '001Jx00001sLcfNIAS',
      fetchPayments: true,
      fetchFinancials: true,
      fetchPledges: true,
      fetchRecurring: true,
      paymentsLimit: 100,
      sortBy: 'date',
      sortDirection: 'DESC',
    }
  );

  // 4. Household Data
  await fetchRaw(
    'WEBHOOK 4: Household Data (MAKE_HOUSEHOLD_DATA_WEBHOOK_URL)',
    process.env.MAKE_HOUSEHOLD_DATA_WEBHOOK_URL,
    {
      action: 'fetch_household_data',
      email: EMAIL,
      contactId: '003Jx00001eIyhKIAS',
      accountId: '001Jx00001sLcfNIAS',
      fetchHousehold: true,
    }
  );

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Done — all raw responses shown above');
  console.log('='.repeat(80));
}

main().catch(console.error);
