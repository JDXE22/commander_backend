import { validateSmtpConfig, SMTP_CONFIG } from '../src/config/config.js';
import { sendEmail } from '../src/utils/email.js';
import assert from 'node:assert';

async function testConfigValidation() {
  console.log('Running Email Config Validation Tests...');

  const originalConfig = JSON.parse(JSON.stringify(SMTP_CONFIG));
  try {
    SMTP_CONFIG.host = undefined;
    assert.throws(() => validateSmtpConfig(), /Missing: SMTP_HOST/);
    SMTP_CONFIG.host = originalConfig.host;

    const originalPort = SMTP_CONFIG.port;
    SMTP_CONFIG.port = NaN;
    assert.throws(() => validateSmtpConfig(), /Missing: SMTP_PORT/);
    SMTP_CONFIG.port = originalPort;

    const originalUser = SMTP_CONFIG.auth.user;
    SMTP_CONFIG.auth.user = undefined;
    assert.throws(() => validateSmtpConfig(), /Missing: SMTP_USER/);
    SMTP_CONFIG.auth.user = originalUser;

    SMTP_CONFIG.host = '';
    await assert.rejects(async () => {
      await sendEmail({
        to: 'test@example.com',
        subject: 'test',
        html: 'test',
      });
    }, /SMTP configuration is incomplete or invalid/);
    SMTP_CONFIG.host = originalConfig.host;

    console.log('SUCCESS: All config validation tests passed!');
  } catch (error) {
    console.error('FAILURE: Tests failed!');
    console.error(error);
    process.exit(1);
  } finally {
    Object.assign(SMTP_CONFIG, originalConfig);
  }
}

testConfigValidation();
