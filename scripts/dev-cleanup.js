const { exec } = require('child_process');
const ports = [8080, 8081, 5173, 5174];

console.log('🧹 Cleaning up ports: ' + ports.join(', '));

function killPort(port) {
    return new Promise((resolve, reject) => {
        // Windows-specific command to find PID
        const cmd = `netstat -ano | findstr :${port}`;
        exec(cmd, (err, stdout, stderr) => {
            if (err || !stdout) {
                // No process found on this port (likely)
                resolve();
                return;
            }

            // Parse output to find PID (last token in the line)
            const lines = stdout.trim().split('\n');
            const pids = new Set();

            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && /^\d+$/.test(pid) && pid !== '0') {
                    pids.add(pid);
                }
            });

            if (pids.size === 0) {
                resolve();
                return;
            }

            const killPromises = Array.from(pids).map(pid => {
                return new Promise((res) => {
                    console.log(`💀 Killing process ${pid} on port ${port}`);
                    exec(`taskkill /PID ${pid} /F`, (kErr, kOut) => {
                        // Ignore errors (process might be gone already)
                        res();
                    });
                });
            });

            Promise.all(killPromises).then(resolve);
        });
    });
}

async function run() {
    for (const port of ports) {
        await killPort(port);
    }
    console.log('✨ Ports cleaned.');
}

run();
