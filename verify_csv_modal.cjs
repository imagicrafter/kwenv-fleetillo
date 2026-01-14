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
    console.log('Verifying CSV upload modal structure...');

    // Login
    await page.goto('http://localhost:8080/login.html');
    await page.fill('#access-code', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to bookings page
    await page.goto('http://localhost:8080/bookings.html');
    await page.waitForTimeout(2000);
    console.log('✅ Loaded bookings page');

    // Check for modal existence
    const modal = await page.$('#csv-upload-modal');
    if (!modal) {
      throw new Error('CSV upload modal not found');
    }
    console.log('✅ CSV upload modal present');

    // Check modal components
    const components = {
      'Modal header': '#csv-upload-modal .modal-header h2',
      'Close button': '#csv-upload-modal .close-csv-modal',
      'Drop zone': '#csv-drop-zone',
      'File input': '#csv-file-input',
      'Select file button': '#csv-file-select-btn',
      'File preview': '#csv-file-preview',
      'Progress indicator': '#csv-upload-progress',
      'Results area': '#csv-upload-results',
      'Success message': '#csv-success-message',
      'Error list': '#csv-error-list',
      'Cancel button': '#csv-cancel-btn',
      'Upload button': '#csv-upload-submit-btn'
    };

    console.log('\nChecking modal components:');
    for (const [name, selector] of Object.entries(components)) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`${name} not found (selector: ${selector})`);
      }
      console.log(`  ✅ ${name}`);
    }

    // Check that modal is hidden by default
    const modalDisplay = await page.evaluate(() => {
      const modal = document.getElementById('csv-upload-modal');
      return window.getComputedStyle(modal).display;
    });

    if (modalDisplay !== 'none') {
      throw new Error('Modal should be hidden by default');
    }
    console.log('✅ Modal hidden by default');

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('\n❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2360_ERROR.png' });
      await browser.close();
      process.exit(1);
    }

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2360_csv_modal_structure.png' });

    console.log('\n✅ CSV upload modal structure verified');
    console.log('   - All required components present');
    console.log('   - Modal properly styled and hidden');
    console.log('📸 Screenshot: .playwright-mcp/task_2360_csv_modal_structure.png');

    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    await page.screenshot({ path: '.playwright-mcp/task_2360_ERROR.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
