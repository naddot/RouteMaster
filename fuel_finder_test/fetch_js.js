
const fs = require('fs');

const baseUrl = 'https://www.fuel-finder.service.gov.uk';
const jsPath = '/_next/static/chunks/4979d23aa81b6afe.js'; // Found in home.html

async function fetchJs() {
    const url = `${baseUrl}${jsPath}`;
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (res.ok) {
            const text = await res.text();
            fs.writeFileSync('fuel_finder_test/app_bundle.js', text);
            console.log('Saved to fuel_finder_test/app_bundle.js');
        } else {
            console.log(`Failed: ${res.status}`);
        }
    } catch (err) {
        console.error(err);
    }
}

fetchJs();
