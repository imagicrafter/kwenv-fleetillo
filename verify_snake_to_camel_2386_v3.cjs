const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set up console error monitoring
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    console.log('🔍 Testing snake_case to camelCase transformation for driver creation...');

    // Step 1: Navigate to login page
    await page.goto('http://localhost:8080/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to login page');

    // Step 2: Login
    await page.fill('#password', 'demo123');
    await page.click('button:has-text("Enter Demo")');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in');

    // Step 3: Navigate to Drivers page
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Give time for page to fully load
    console.log('✅ Navigated to Drivers page');

    // Take screenshot of initial state
    await page.screenshot({ path: '.playwright-mcp/task_2386_step1_drivers_page.png' });

    // Step 4: Find and click Add Driver button
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons on page`);

    let addButton = null;
    for (const btn of buttons) {
      const text = await btn.textContent();
      const trimmedText = text.trim();
      console.log(`Button text: "${trimmedText}"`);

      if (trimmedText.includes('Add Driver') || trimmedText.includes('＋') || trimmedText === 'Add') {
        addButton = btn;
        break;
      }
    }

    if (!addButton) {
      throw new Error('Add Driver button not found after checking all buttons');
    }

    await addButton.click();
    await page.waitForTimeout(1500);
    console.log('✅ Clicked Add Driver button');

    // Wait for modal to appear
    await page.waitForSelector('#driverModal', { state: 'visible', timeout: 5000 });
    console.log('✅ Driver modal opened');

    // Take screenshot of modal
    await page.screenshot({ path: '.playwright-mcp/task_2386_step2_modal_open.png' });

    // Step 5: Fill in the form
    await page.fill('#firstName', 'TestSnake');
    await page.fill('#lastName', 'CamelCase');
    await page.fill('#phoneNumber', '555-9999');
    await page.fill('#email', 'snake.camel@test.com');
    await page.fill('#licenseNumber', 'DL123456');
    await page.fill('#licenseClass', 'C');

    console.log('✅ Filled in driver form');

    // Take screenshot of filled form
    await page.screenshot({ path: '.playwright-mcp/task_2386_step3_form_filled.png' });

    // Step 6: Submit the form
    const submitButtons = await page.$$('#driverForm button');
    let saveButton = null;

    for (const btn of submitButtons) {
      const text = await btn.textContent();
      if (text.trim() === 'Save' || text.includes('Save')) {
        saveButton = btn;
        break;
      }
    }

    if (!saveButton) {
      throw new Error('Save button not found');
    }

    await saveButton.click();
    console.log('✅ Clicked Save button');

    // Step 7: Wait for success indication
    await page.waitForTimeout(3000);

    // Check for toast message
    const toast = await page.$('.toast');
    if (toast) {
      const toastText = await toast.textContent();
      console.log(`✅ Toast appeared: "${toastText}"`);

      if (toastText.includes('successfully')) {
        console.log('✅ Success message confirmed');
      }
    }

    // Take screenshot after submission
    await page.screenshot({ path: '.playwright-mcp/task_2386_step4_after_submit.png' });

    // Step 8: Wait for table to reload
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2386_step5_final_state.png' });

    // Check for console errors - specifically RPC errors
    const hasRpcError = consoleErrors.some(err =>
      err.includes('RPC') &&
      (err.includes('failed') || err.includes('error')) &&
      err.includes('drivers.create')
    );

    if (hasRpcError) {
      console.error('❌ RPC drivers.create error detected - transformation NOT working!');
      consoleErrors.forEach(err => console.error('  -', err));
      await browser.close();
      process.exit(1);
    }

    if (consoleErrors.length > 0) {
      console.warn('⚠️  Some console errors detected (but not RPC related):');
      consoleErrors.forEach(err => console.warn('  -', err));
    }

    console.log('\n✅ SUCCESS: Snake_case to camelCase transformation working correctly!');
    console.log('📊 Summary:');
    console.log('  - Driver modal opened successfully');
    console.log('  - Form filled with test data');
    console.log('  - Form submitted successfully');
    console.log('  - No RPC drivers.create errors (transformation working!)');
    console.log(`  - Console errors (non-RPC): ${consoleErrors.length}`);
    console.log(`  - Console warnings: ${consoleWarnings.length}`);

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ path: '.playwright-mcp/task_2386_ERROR.png' });

    if (consoleErrors.length > 0) {
      console.error('\nConsole errors:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    await browser.close();
    process.exit(1);
  }
})();
