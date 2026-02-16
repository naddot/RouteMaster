
const fs = require('fs');

const baseUrl = 'https://www.fuel-finder.service.gov.uk';
const homeHtml = fs.readFileSync('fuel_finder_test/home.html', 'utf8');

// Regex to find script srcs
const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
const matches = [...homeHtml.matchAll(scriptRegex)];

async function fetchAndSearch() {
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
                // Naive search for interesting strings
                if (text.includes('API_ENDPOINTS') || text.includes('api.fuel') || text.includes('v1/prices')) {
                    console.log(`\n[MATCH] Interesting content in ${filename}:`);
                    // Print context
                    const index = text.indexOf('API_ENDPOINTS');
                    if (index > -1) {
                        console.log('...API_ENDPOINTS context:', text.substring(index, index + 200));
                    }
                    const index2 = text.indexOf('api.fuel');
                    if (index2 > -1) {
                        console.log('...api.fuel context:', text.substring(index2, index2 + 200));
                    }
                }
            } else {
                console.log(`Failed: ${res.status}`);
            }
        } catch (err) {
            console.error(`Error fetching ${path}: ${err.message}`);
        }
    }
}

fetchAndSearch();
