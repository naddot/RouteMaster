
const BASE_URL = 'https://www.fuel-finder.service.gov.uk';

const paths = [
    '/v1/prices',
    '/api/v1/prices',
    '/fuel-prices',
    '/api/fuel-prices',
    '/oauth/token',
    '/auth/token',
    '/token',
    '/api/token',
    '/developer/api-documentation', // Re-check this
    '/robots.txt' // See if we can hit anything
];

async function checkPath(path) {
    const url = `${BASE_URL}${path}`;
    try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log(`${res.status} ${path}`);
    } catch (err) {
        console.log(`ERR ${path}: ${err.message}`);
    }
}

async function main() {
    console.log(`Checking paths on ${BASE_URL}...`);
    for (const p of paths) {
        await checkPath(p);
    }
}

main();
