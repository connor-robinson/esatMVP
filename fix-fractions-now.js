/**
 * Quick script to fix fractions - calls the API route
 */
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/questions/fix-fractions',
  method: 'POST',
};

console.log('Fixing fractions in database...');
console.log('Calling: http://localhost:3000/api/questions/fix-fractions');
console.log();

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.error('Make sure your Next.js dev server is running on port 3000');
  process.exit(1);
});

req.end();


















