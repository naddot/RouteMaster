
const dns = require('dns');

const hosts = [
    'api.fuelfinder.service.gov.uk',
    'api.fuel-finder.service.gov.uk',
    'www.fuel-finder.service.gov.uk',
    'fuel-finder.service.gov.uk',
    'fuelfinder.service.gov.uk'
];

hosts.forEach(host => {
    dns.lookup(host, (err, address, family) => {
        if (err) {
            console.log(`[FAIL] ${host}: ${err.code}`);
        } else {
            console.log(`[OK]   ${host}: ${address}`);
        }
    });
});
