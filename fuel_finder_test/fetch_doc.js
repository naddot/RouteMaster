
const fs = require('fs');

async function fetchPath(path) {
    const url = `https://www.fuel-finder.service.gov.uk${path}`;
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        const html = await res.text();
        if (res.ok) {
            fs.writeFileSync(`fuel_finder_test/doc_${path.replace(/\//g, '_')}.html`, html);
            console.log(`Saved to fuel_finder_test/doc_${path.replace(/\//g, '_')}.html`);
        } else {
            console.log('Failed to fetch.');
        }
    } catch (err) {
        console.error(err);
    }
}

async function main() {
    await fetchPath('/developer/api-documentation');
    await fetchPath('/developer');
}

main();
