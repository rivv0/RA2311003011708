const Log = require('./logger');

async function run() {
  await Log('backend', 'info', 'service', 'Test log message from middleware');
  console.log('Log sent successfully');
}
run();
