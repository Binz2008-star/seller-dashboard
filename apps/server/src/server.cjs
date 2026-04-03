const { createServer } = require('http');
const { exec } = require('child_process');

// Start the bun server
const serverProcess = exec('C:\\Users\\loyal\\.bun\\bin\\bun.exe run --hot src/index.ts', {
  cwd: __dirname,
  stdio: 'inherit'
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

serverProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});
