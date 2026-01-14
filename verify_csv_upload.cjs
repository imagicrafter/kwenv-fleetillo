const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Capture console errors
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    console.log('Step 0: Login first');
    await page.goto('http://localhost:8080/login.html');
    await page.fill('#access-code', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html', { timeout: 5000 });

    console.log('Step 1: Navigate to bookings page');
    await page.goto('http://localhost:8080/bookings.html', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '.playwright-mcp/task_2363_step1_bookings_page.png' });

    console.log('Step 2: Click Upload CSV button to open modal');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });
    await page.screenshot({ path: '.playwright-mcp/task_2363_step2_modal_open.png' });

    console.log('Step 3: Upload CSV file via file input');
    const csvFilePath = path.resolve(__dirname, 'test_bookings.csv');
    await page.setInputFiles('#csv-file-input', csvFilePath);

    // Wait for file preview to show
    await page.waitForSelector('#csv-file-preview', { state: 'visible' });
    await page.screenshot({ path: '.playwright-mcp/task_2363_step3_file_selected.png' });

    // Verify upload button is enabled
    const uploadBtnDisabled = await page.$eval('#csv-upload-submit-btn', btn => btn.disabled);
    console.log('Upload button disabled:', uploadBtnDisabled);
    if (uploadBtnDisabled) {
      throw new Error('Upload button should be enabled after file selection');
    }

    console.log('Step 4: Click Upload button and verify progress');
    await page.click('#csv-upload-submit-btn');

    // Wait a moment for progress to show
    await page.waitForTimeout(200);

    // Check if progress div is visible
    const progressVisible = await page.isVisible('#csv-upload-progress');
    console.log('Progress indicator visible:', progressVisible);

    await page.screenshot({ path: '.playwright-mcp/task_2363_step4_uploading.png' });

    console.log('Step 5: Wait for upload to complete and check results');
    // Wait for results to appear (with generous timeout for API call)
    await page.waitForSelector('#csv-upload-results', { state: 'visible', timeout: 10000 });
    await page.screenshot({ path: '.playwright-mcp/task_2363_step5_results.png' });

    // Check for success or error message
    const successVisible = await page.isVisible('#csv-success-message');
    const errorVisible = await page.isVisible('#csv-error-list');

    console.log('Success message visible:', successVisible);
    console.log('Error message visible:', errorVisible);

    if (successVisible) {
      const successText = await page.textContent('#csv-success-message');
      console.log('Success message:', successText);
    }

    if (errorVisible) {
      const errorText = await page.textContent('#csv-error-list');
      console.log('Error message:', errorText);
    }

    console.log('Step 6: Close modal');
    await page.click('#csv-cancel-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'hidden', timeout: 2000 });
    await page.screenshot({ path: '.playwright-mcp/task_2363_step6_modal_closed.png' });

    // Check console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2363_ERROR.png' });
      await browser.close();
      process.exit(1);
    }

    await page.screenshot({ path: '.playwright-mcp/task_2363_verified.png' });

    console.log(JSON.stringify({
      success: true,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      uploadCompleted: successVisible || errorVisible,
      message: '✅ CSV upload workflow verified successfully'
    }, null, 2));

    await browser.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2363_ERROR.png' });
    await browser.close();
    process.exit(1);
  }
})();
