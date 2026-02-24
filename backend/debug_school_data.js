const http = require('http');

const slug = 'green-springs-school';
const state = 'Lagos';
const area = 'Lekki';

const url = `http://localhost:5000/api/schools/${state}/${area}/${slug}`;

console.log(`Fetching data from: ${url}`);

http.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const school = JSON.parse(data);
      console.log('--- School Data Debug ---');
      console.log('Name:', school.name);
      console.log('Logo URL:', school.logo_url);
      console.log('Student Count:', school.student_count);
      console.log('Management Info:', JSON.stringify(school.management_info, null, 2));
      console.log('Student Life:', JSON.stringify(school.student_life, null, 2));
      console.log('Facilities:', JSON.stringify(school.facilities, null, 2));
      console.log('-------------------------');
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw Data:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching data:', err.message);
});
