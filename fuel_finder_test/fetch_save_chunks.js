
const fs = require('fs');

const baseUrl = 'https://www.fuel-finder.service.gov.uk';
const homeHtml = fs.readFileSync('fuel_finder_test/home.html', 'utf8');

const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
const matches = [...homeHtml.matchAll(scriptRegex)];

async function fetchAndSave() {
    console.log(`Found ${matches.length} scripts.`);

    for (const match of matches) {
        const path = match[1];
        const url = `${baseUrl}${path}`;
        const filename = path.split('/').pop();

        console.log(`Fetching ${url}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                fs.writeFileSync(`fuel_finder_test/chunks/${filename}`, text);
                console.log(`Saved ${filename}`);
            } else {
                console.log(`Failed: ${res.status}`);
            }
        } catch (err) {
            console.error(err);
        }
    }
}

fetchAndSave();
