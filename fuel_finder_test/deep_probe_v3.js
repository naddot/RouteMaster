
const net = require('net');
const tls = require('tls');
const dns = require('dns');

const host = 'api.fuel-finder.service.gov.uk';
const port = 443;

console.log(`Probe: ${host}:${port}`);

// 1. DNS
dns.lookup(host, (err, address) => {
    if (err) {
        console.log(`[DNS] FAIL: ${err.code}`);
        return;
    }
    console.log(`[DNS] OK: ${address}`);

    // 2. TLS
    const socket = tls.connect(port, host, { servername: host }, () => {
        console.log(`[TLS] OK: Connected`);
        socket.end();
    });

    socket.on('error', (err) => {
        console.log(`[TLS] FAIL: ${err.message}`);
    });

    socket.setTimeout(5000, () => {
        console.log('[TLS] FAIL: Timeout');
        socket.destroy();
    });
});
