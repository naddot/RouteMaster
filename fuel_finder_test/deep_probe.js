
const net = require('net');
const tls = require('tls');
const dns = require('dns');

const hosts = [
    { host: 'api.fuel-finder.service.gov.uk', port: 443 },
    { host: 'www.fuel-finder.service.gov.uk', port: 443 }
];

async function checkConnection(host, port) {
    console.log(`\nChecking ${host}:${port}...`);

    // 1. DNS
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.lookup(host, (err, address) => err ? reject(err) : resolve(address));
        });
        console.log(`[DNS] OK: ${addresses}`);
    } catch (err) {
        console.log(`[DNS] FAIL: ${err.code}`);
        return; // Stop if DNS fails
    }

    // 2. TCP/TLS
    return new Promise(resolve => {
        const socket = tls.connect(port, host, { servername: host }, () => {
            console.log(`[TLS] OK: Connected`);
            socket.end();
            resolve(true);
        });

        socket.on('error', (err) => {
            console.log(`[TLS] FAIL: ${err.message}`);
            resolve(false);
        });

        socket.setTimeout(5000, () => {
            console.log('[TLS] FAIL: Timeout');
            socket.destroy();
            resolve(false);
        });
    });
}

async function tryPath(host, path) {
    const url = `https://${host}${path}`;
    console.log(`\nFetching ${url}...`);
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);
    } catch (err) {
        console.log(`Error: ${err.message} (${err.cause})`);
    }
}

async function main() {
    for (const h of hosts) {
        const connected = await checkConnection(h.host, h.port);
        if (connected) {
            // Try known paths if connection works
            if (h.host.includes('www')) {
                await tryPath(h.host, '/v1/prices'); // Guessing
                await tryPath(h.host, '/api/v1/prices'); // Guessing
            } else {
                await tryPath(h.host, '/v1/prices');
                await tryPath(h.host, '/oauth/token'); // POST usually, but GET might give 405 not 404/Fail
            }
        }
    }
}

main();
