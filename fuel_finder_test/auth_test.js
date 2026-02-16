
const dns = require('dns');

const candidates = [
    { host: 'api.fuelfinder.service.gov.uk', name: 'Documented URL' },
    { host: 'api.fuel-finder.service.gov.uk', name: 'Hyphenated Guess' },
    { host: 'www.fuel-finder.service.gov.uk', name: 'Reachable Website' }
];

async function checkHost(candidate) {
    console.log(`\n--- Checking ${candidate.name} (${candidate.host}) ---`);

    // 1. DNS Resolution
    try {
        const address = await new Promise((resolve, reject) => {
            dns.lookup(candidate.host, (err, addr) => {
                if (err) reject(err);
                else resolve(addr);
            });
        });
        console.log(`[DNS] Resolved: ${address}`);
    } catch (err) {
        console.log(`[DNS] Failed: ${err.code}`);
        return; // Stop if DNS fails
    }

    // 2. Token Endpoint Test
    const tokenUrl = `https://${candidate.host}/oauth/token`;
    console.log(`Testing POST ${tokenUrl}...`);

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);
    params.append('scope', 'fuelfinder.read');

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log(`[HTTP] Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log('>>> SUCCESS! Token received.');
            return data.access_token;
        } else {
            const text = await response.text();
            console.log(`[HTTP] Body: ${text.substring(0, 100)}...`);
        }
    } catch (error) {
        console.log(`[HTTP] Error: ${error.message} (${error.cause || 'No cause'})`);
    }
}

async function main() {
    if (!process.env.CLIENT_ID) {
        console.error('Error: CLIENT_ID not found in environment.');
        return;
    }

    console.log('Starting Fuel Finder Connectivity Test...');

    for (const c of candidates) {
        await checkHost(c);
    }
}

main();
