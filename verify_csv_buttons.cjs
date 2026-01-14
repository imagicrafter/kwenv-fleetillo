const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    console.log('Verifying CSV buttons on bookings page...');

    // Login
    await page.goto('http://localhost:8080/login.html');
    await page.fill('#access-code', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to bookings page
    await page.goto('http://localhost:8080/bookings.html');
    await page.waitForTimeout(2000);
    console.log('✅ Loaded bookings page');

    // Check for the three buttons
    const downloadBtn = await page.$('#download-template-btn');
    const uploadBtn = await page.$('#upload-csv-btn');
    const newBookingBtn = await page.$('#add-booking-btn');

    if (!downloadBtn) {
      throw new Error('Download Template button not found');
    }
    console.log('✅ Download Template button present');

    if (!uploadBtn) {
      throw new Error('Upload CSV button not found');
    }
    console.log('✅ Upload CSV button present');

    if (!newBookingBtn) {
      throw new Error('New Booking button not found');
    }
    console.log('✅ New Booking button present');

    // Check button text content
    const downloadText = await downloadBtn.textContent();
    const uploadText = await uploadBtn.textContent();
    const newBookingText = await newBookingBtn.textContent();

    console.log(`\nButton labels:`);
    console.log(`  - Download: "${downloadText.trim()}"`);
    console.log(`  - Upload: "${uploadText.trim()}"`);
    console.log(`  - New Booking: "${newBookingText.trim()}"`);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('\n❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2359_ERROR.png' });
      await browser.close();
      process.exit(1);
    }

    // Take screenshot showing all three buttons
    await page.screenshot({ path: '.playwright-mcp/task_2359_csv_buttons_added.png' });

    console.log('\n✅ All three buttons verified and visible');
    console.log('📸 Screenshot: .playwright-mcp/task_2359_csv_buttons_added.png');

    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    await page.screenshot({ path: '.playwright-mcp/task_2359_ERROR.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
