const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Fintech Security Integration Tests ---');
  
  const testEmail = `test_sec_${Date.now()}@test.com`;
  const testPassword = 'Password123!';
  let authCookie = '';

  // Step 1: Register Test User
  try {
    const regRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Test Security User'
    }));
    console.log(`[Setup] Register User: Status = ${regRes.statusCode}`);
  } catch (err) {
    console.error('[Setup] Register Error:', err);
  }

  // Step 2: Login Test User to acquire Cookie
  try {
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      email: testEmail,
      password: testPassword
    }));
    console.log(`[Setup] Login User: Status = ${loginRes.statusCode}`);
    if (loginRes.headers['set-cookie']) {
      authCookie = loginRes.headers['set-cookie'][0].split(';')[0];
      console.log('[Setup] Acquired Auth Cookie:', authCookie.substring(0, 20) + '...');
    }
  } catch (err) {
    console.error('[Setup] Login Error:', err);
  }

  // Test 1: CORS Protection on State Changes
  // Making a POST request with an unauthorized origin header should return 403 Forbidden.
  try {
    const corsRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Origin': 'http://malicious-origin.com',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      email: 'hacker@target.com',
      password: 'Password123!',
      full_name: 'Evil Hacker'
    }));
    
    console.log(`[Test 1] CORS State Change Blocking: Status = ${corsRes.statusCode} (Expected: 403)`);
    if (corsRes.statusCode === 403) {
      console.log('  -> PASS: Request from unauthorized origin was successfully blocked.');
    } else {
      console.log('  -> FAIL: Request from unauthorized origin was NOT blocked.');
    }
  } catch (err) {
    console.error('[Test 1] Error:', err);
  }

  // Test 2: Malformed UUID Validation
  // Requesting a todo with a malformed ID should return 400 Bad Request.
  try {
    const uuidRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/todo?id=not-a-valid-uuid-format',
      method: 'GET',
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[Test 2] UUID Format Check: Status = ${uuidRes.statusCode} (Expected: 400)`);
    console.log('[Test 2] Body:', uuidRes.body);
    if (uuidRes.statusCode === 400) {
      console.log('  -> PASS: Malformed UUID request was rejected directly with 400.');
    } else {
      console.log('  -> FAIL: Malformed UUID request did not return 400.');
    }
  } catch (err) {
    console.error('[Test 2] Error:', err);
  }

  // Test 3: Client IP Rate Limiting Verification
  // Generate 20 rapid requests to verify we trigger rate limiting (Status 429).
  console.log('[Test 3] Client-based Rate Limiter Verification...');
  let hitLimit = false;
  let statusCodes = [];
  
  for (let i = 0; i < 20; i++) {
    try {
      const rateRes = await request({
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/auth/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // NOTE: X-Forwarded-For is intentionally NOT used here to "isolate" this test.
          // The backend no longer trusts client-supplied X-Forwarded-For for rate-limit
          // identity (only X-Real-IP, which our nginx proxy always overwrites with the
          // true connecting address, or the proxy-appended last X-Forwarded-For entry).
          // Spoofing this header can no longer bypass the rate limiter; this test now
          // shares rate-limit state with the runner's real IP, like any other client.
        }
      }, JSON.stringify({}));
      
      statusCodes.push(rateRes.statusCode);
      if (rateRes.statusCode === 429) {
        hitLimit = true;
      }
    } catch (err) {
      // Ignored
    }
  }
  
  console.log(`[Test 3] Rate Limit Status Codes: ${statusCodes.join(', ')}`);
  if (hitLimit) {
    console.log('  -> PASS: Successfully hit HTTP 429 Rate Limit.');
  } else {
    console.log('  -> FAIL: Did not trigger rate limit.');
  }

  console.log('--- Integration Testing Completed ---');
}

runTests();
