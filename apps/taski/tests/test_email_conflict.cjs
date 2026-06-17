const http = require('http');

function postJson(urlPath, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseBody ? JSON.parse(responseBody) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function putJson(urlPath, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: urlPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseBody ? JSON.parse(responseBody) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  const email1 = `user1_${Date.now()}@example.com`;
  const email2 = `user2_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log(`Registering user1: ${email1}...`);
  await postJson('/api/auth/register', { email: email1, full_name: 'User One', password });

  console.log(`Registering user2: ${email2}...`);
  await postJson('/api/auth/register', { email: email2, full_name: 'User Two', password });

  console.log('Logging in as user1...');
  const loginRes = await postJson('/api/auth/login', { email: email1, password });
  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  const authHeaders = { 'Cookie': cookie.split(';')[0] };

  console.log(`Attempting to change user1 email to user2 email: ${email2}...`);
  const updateRes = await putJson('/api/auth/profile', {
    email: email2,
    password: password,
    full_name: 'User One',
    company_name: '',
    designation: '',
    department: '',
    date_of_birth: ''
  }, authHeaders);

  console.log('Update response status:', updateRes.status);
  console.log('Update response body:', updateRes.body);

  if (updateRes.status !== 409) {
    throw new Error(`Expected status 409 Conflict for duplicate email, got ${updateRes.status}`);
  }
  if (!updateRes.body.error.includes('already registered')) {
    throw new Error(`Expected conflict error message, got: "${updateRes.body.error}"`);
  }

  console.log('SUCCESS! Email conflict returns 409 Conflict instead of 500.');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
