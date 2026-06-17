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
  const email = `test_prof_${Date.now()}@example.com`;
  const password = 'Password123!';
  const fullName = 'Profile Tester';

  console.log(`Registering ${email}...`);
  const regRes = await postJson('/api/auth/register', { email, full_name: fullName, password });
  if (regRes.status !== 201 && regRes.status !== 200) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  }

  console.log('Logging in...');
  const loginRes = await postJson('/api/auth/login', { email, password });
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }

  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  if (!cookie) {
    throw new Error('No cookie returned from login');
  }
  const authHeaders = { 'Cookie': cookie.split(';')[0] };

  // Helper function to test profile updates
  async function testProfile(payload, expectedStatus, expectedErrorSnippet) {
    console.log(`Testing profile update with: ${JSON.stringify(payload)}...`);
    const res = await putJson('/api/auth/profile', payload, authHeaders);
    
    if (res.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(res.body)}`);
    }
    if (expectedStatus !== 200 && expectedErrorSnippet) {
      const errMsg = res.body.error || '';
      if (!errMsg.toLowerCase().includes(expectedErrorSnippet.toLowerCase())) {
        throw new Error(`Expected error snippet "${expectedErrorSnippet}", got: "${errMsg}"`);
      }
    }
    console.log(`-> Test PASSED (status: ${res.status})`);
  }

  // 1. Test empty Full Name (should succeed now!)
  await testProfile({
    email,
    full_name: '',
    company_name: 'Test Corp',
    designation: 'Developer',
    department: 'Engineering'
  }, 200);

  // 2. Test invalid Full Name (should fail)
  await testProfile({
    email,
    full_name: 'John123',
    company_name: 'Test Corp'
  }, 400, 'full name');

  // 3. Test invalid characters in Company Name (should fail)
  await testProfile({
    email,
    full_name: 'Valid Name',
    company_name: 'Test Corp #1', // # is not allowed
  }, 400, 'company name');

  // 4. Test invalid characters in Designation (should fail)
  await testProfile({
    email,
    full_name: 'Valid Name',
    company_name: 'Test Corp',
    designation: 'Dev_Lead', // _ is not allowed
  }, 400, 'designation');

  // 5. Test invalid characters in Department (should fail)
  await testProfile({
    email,
    full_name: 'Valid Name',
    company_name: 'Test Corp',
    designation: 'Developer',
    department: 'Eng!Dept', // ! is not allowed
  }, 400, 'department');

  // 6. Test valid characters in fields (should succeed)
  await testProfile({
    email,
    full_name: 'Valid Name',
    company_name: 'Test Corp (A & B), LLC.',
    designation: 'Lead Developer-Specialist',
    department: 'Engineering, Dept.'
  }, 200);

  console.log('ALL PROFILE VALIDATIONS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Validation test failed:', err);
  process.exit(1);
});
