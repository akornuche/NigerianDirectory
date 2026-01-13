// Check school data from API
const http = require('http');

const schools = ['federal-government-girls-college-abuja', 'kings-college-lagos'];

schools.forEach(slug => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/schools/slug/${slug}`,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const school = JSON.parse(data);
      console.log('\n=== ' + school.name + ' ===');
      console.log('Has content_sources:', school.content_sources ? 'YES' : 'NO');
      if (school.content_sources) {
        console.log('Content sources:', JSON.stringify(school.content_sources, null, 2));
      }
      console.log('Has enriched_history:', school.enriched_history ? 'YES' : 'NO');
      console.log('Has enriched_academics:', school.enriched_academics ? 'YES' : 'NO');
    });
  });
  req.on('error', e => console.error(e));
  req.end();
});
