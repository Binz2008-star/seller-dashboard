const { Client } = require('pg');

async function testConnection(user, password, database) {
  const connectionString = `postgresql://${user}:${password}@localhost:5432/${database}`;
  console.log(`Testing: ${connectionString}`);
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connection successful');
    const res = await client.query('SELECT NOW()');
    console.log('✅ Query successful:', res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function testAll() {
  const tests = [
    { user: 'postgres', password: '', database: 'postgres' },
    { user: 'postgres', password: 'postgres', database: 'postgres' },
    { user: 'postgres', password: 'admin', database: 'postgres' },
    { user: 'postgres', password: '123456', database: 'postgres' },
  ];

  for (const test of tests) {
    if (await testConnection(test.user, test.password, test.database)) {
      console.log(`\n🎉 FOUND WORKING CREDENTIALS: ${test.user}:${test.password}`);
      return;
    }
  }
  console.log('\n❌ No working credentials found');
}

testAll();
