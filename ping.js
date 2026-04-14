import http from 'http';

http.get('http://localhost:3000/api/services', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data:', data.substring(0, 100));
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
