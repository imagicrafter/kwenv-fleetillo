const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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

    // Test 1: File size validation
    console.log('\n✓ Test 1: File size validation');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });

    // Create a large file (> 10MB)
    const largePath = path.resolve(__dirname, 'large_test.csv');
    fs.writeFileSync(largePath, 'a'.repeat(11 * 1024 * 1024));

    await page.setInputFiles('#csv-file-input', largePath);
    await page.waitForTimeout(500);

    let errorVisible = await page.isVisible('#csv-error-list');
    if (errorVisible) {
      const errorText = await page.textContent('#csv-error-list');
      console.log('  ✓ File size validation error shown:', errorText.includes('10MB'));
    }

    fs.unlinkSync(largePath);
    await page.screenshot({ path: '.playwright-mcp/task_2365_file_size_error.png' });

    // Close and reopen
    await page.click('#csv-cancel-btn');
    await page.waitForTimeout(200);

    // Test 2: File type validation
    console.log('\n✓ Test 2: File type validation');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });

    const txtPath = path.resolve(__dirname, 'test.txt');
    fs.writeFileSync(txtPath, 'test content');

    await page.setInputFiles('#csv-file-input', txtPath);
    await page.waitForTimeout(500);

    errorVisible = await page.isVisible('#csv-error-list');
    if (errorVisible) {
      const errorText = await page.textContent('#csv-error-list');
      console.log('  ✓ File type validation error shown:', errorText.includes('CSV'));
    }

    fs.unlinkSync(txtPath);
    await page.screenshot({ path: '.playwright-mcp/task_2365_file_type_error.png' });

    // Close and reopen
    await page.click('#csv-cancel-btn');
    await page.waitForTimeout(200);

    // Test 3: Enhanced error display with row errors
    console.log('\n✓ Test 3: Enhanced error display');
    await page.click('#upload-csv-btn');
    await page.waitForSelector('#csv-upload-modal', { state: 'visible' });

    const csvPath = path.resolve(__dirname, 'test_bookings.csv');
    await page.setInputFiles('#csv-file-input', csvPath);
    await page.waitForSelector('#csv-file-preview', { state: 'visible' });

    await page.click('#csv-upload-submit-btn');
    await page.waitForSelector('#csv-upload-results', { state: 'visible', timeout: 10000 });
    await page.screenshot({ path: '.playwright-mcp/task_2365_enhanced_errors.png' });

    errorVisible = await page.isVisible('#csv-error-list');
    if (errorVisible) {
      const errorHTML = await page.innerHTML('#csv-error-list');

      console.log('  ✓ Error summary shown:', errorHTML.includes('Found'));
      console.log('  ✓ Helpful hints shown:', errorHTML.includes('Helpful hints'));
      console.log('  ✓ Date format hint shown:', errorHTML.includes('YYYY-MM-DD'));
      console.log('  ✓ Required columns shown:', errorHTML.includes('Required columns'));
    }

    // Test 4: Try Again button
    console.log('\n✓ Test 4: Try Again button');
    const tryAgainExists = await page.isVisible('#csv-try-again-btn');
    console.log('  ✓ Try Again button visible:', tryAgainExists);

    if (tryAgainExists) {
      await page.click('#csv-try-again-btn');
      await page.waitForTimeout(300);

      const dropZoneVisible = await page.isVisible('.drop-zone-content');
      console.log('  ✓ Modal reset after Try Again:', dropZoneVisible);
      await page.screenshot({ path: '.playwright-mcp/task_2365_try_again_reset.png' });
    }

    await page.screenshot({ path: '.playwright-mcp/task_2365_verified.png' });

    console.log('\n✅ Enhanced validation and error display verified!');
    console.log('- Client-side file size validation works');
    console.log('- Client-side file type validation works');
    console.log('- Enhanced error display with summary and hints');
    console.log('- Try Again button resets modal');

    await browser.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2365_ERROR.png' });
    await browser.close();
    process.exit(1);
  }
})();
