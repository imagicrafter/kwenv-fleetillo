const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.log('✓ Login');
    await page.goto('http://localhost:8080/login.html');
    await page.fill('#access-code', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html', { timeout: 5000 });

    console.log('✓ Navigate to bookings page');
    await page.goto('http://localhost:8080/bookings.html', { waitUntil: 'networkidle' });

    console.log('✓ Set up download listener');
    const downloadPromise = page.waitForEvent('download');

    console.log('✓ Click Download Template button');
    await page.click('#download-template-btn');

    console.log('✓ Wait for download to start');
    const download = await downloadPromise;

    console.log('✓ Verify download filename');
    const filename = download.suggestedFilename();
    console.log('  Downloaded file:', filename);

    if (filename !== 'bookings_template.csv') {
      throw new Error(`Expected filename 'bookings_template.csv' but got '${filename}'`);
    }

    await page.screenshot({ path: '.playwright-mcp/task_2364_template_download.png' });

    console.log('✓ Verify modal opens when clicking Upload CSV');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });
    await page.screenshot({ path: '.playwright-mcp/task_2364_modal_opened.png' });

    console.log('✓ Verify modal closes with X button');
    await page.click('.close-csv-modal');
    await page.waitForSelector('#csv-upload-modal', { state: 'hidden' });

    console.log('✓ Verify modal opens again');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });

    console.log('✓ Verify modal closes with Cancel button');
    await page.click('#csv-cancel-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'hidden' });

    console.log('✓ Verify modal closes when clicking outside');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });

    // Click on the modal backdrop (outside the modal content)
    await page.click('#csv-upload-modal', { position: { x: 5, y: 5 } });
    await page.waitForSelector('#csv-upload-modal', { state: 'hidden' });

    await page.screenshot({ path: '.playwright-mcp/task_2364_verified.png' });

    console.log('\n✅ Template download and modal management verified successfully!');
    console.log('- Template download works with correct filename');
    console.log('- Modal opens when clicking Upload CSV button');
    console.log('- Modal closes with X button');
    console.log('- Modal closes with Cancel button');
    console.log('- Modal closes when clicking outside');

    await browser.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2364_ERROR.png' });
    await browser.close();
    process.exit(1);
  }
})();
