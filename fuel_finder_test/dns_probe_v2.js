
const dns = require('dns');

const hosts = [
    'api.fuelfinder.service.gov.uk',
    'api.fuel-finder.service.gov.uk',
    'www.fuel-finder.service.gov.uk'
];

async function checkHost(host) {
    return new Promise(resolve => {
        dns.lookup(host, (err, address) => {
            if (err) {
                console.log(`[FAIL] ${host}: ${err.code}`);
            } else {
                console.log(`[OK]   ${host}: ${address}`);
            }
            resolve();
        });
    });
}

async function main() {
    for (const host of hosts) {
        await checkHost(host);
    }
}

main();
