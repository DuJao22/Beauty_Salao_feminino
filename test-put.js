import http from 'http';

const data = JSON.stringify([
  {
    "id": 1,
    "day_of_week": 0,
    "start_time": "09:00",
    "end_time": "18:00",
    "is_active": 1,
    "start_time_2": "14:00",
    "end_time_2": "18:00"
  }
]);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/working-hours',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
