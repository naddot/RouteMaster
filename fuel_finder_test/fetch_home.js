
const fs = require('fs');

const url = 'https://www.fuel-finder.service.gov.uk';
console.log(`Fetching ${url}...`);

fetch(url).then(res => res.text()).then(html => {
    fs.writeFileSync('fuel_finder_test/home.html', html);
    console.log('Saved to fuel_finder_test/home.html');
}).catch(err => console.error(err));
