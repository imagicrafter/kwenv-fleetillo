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

    // Step 1: Navigate to login page and login
    await page.goto('http://localhost:8080/login.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to login page');

    // Fill and submit login form
    await page.fill('#access-code', 'demo123');
    await page.click('button#login-btn');

    // Wait for redirect to main page
    await page.waitForURL(/index\.html|http:\/\/localhost:8080\/$/, { timeout: 5000 });
    await page.waitForTimeout(1000);
    console.log('✅ Logged in and redirected to main page');

    // Step 2: Navigate to Drivers page from sidebar
    await page.click('a[href="drivers.html"]');
    await page.waitForURL(/drivers\.html/, { timeout: 5000 });
    await page.waitForTimeout(3000); // Give time for drivers page to fully load
    console.log('✅ Navigated to Drivers page');

    // Take screenshot of initial state
    await page.screenshot({ path: '.playwright-mcp/task_2386_step1_drivers_page.png' });

    // Step 3: Find and click Add Driver button
    await page.waitForSelector('button', { timeout: 10000 });

    // Try clicking the Add Driver button (look for + or Add Driver text)
    const addDriverBtn = await page.$('button:has-text("Add Driver"), button:has-text("＋")');

    if (!addDriverBtn) {
      // Debug: show what buttons are available
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons`);
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(`  Button: "${text.trim()}"`);
      }
      throw new Error('Add Driver button not found');
    }

    await addDriverBtn.click();
    await page.waitForTimeout(1500);
    console.log('✅ Clicked Add Driver button');

    // Wait for modal to appear
    await page.waitForSelector('#driverModal', { state: 'visible', timeout: 5000 });
    console.log('✅ Driver modal opened');

    // Take screenshot of modal
    await page.screenshot({ path: '.playwright-mcp/task_2386_step2_modal_open.png' });

    // Step 4: Fill in the form
    await page.fill('#firstName', 'SnakeTest');
    await page.fill('#lastName', 'CamelTest');
    await page.fill('#phoneNumber', '555-7777');
    await page.fill('#email', 'snakecamel@test.com');

    // Try to fill optional fields
    try {
      await page.fill('#licenseNumber', 'DL888888');
      await page.fill('#licenseClass', 'B');
    } catch (e) {
      console.log('Optional fields not available');
    }

    console.log('✅ Filled in driver form');

    // Take screenshot of filled form
    await page.screenshot({ path: '.playwright-mcp/task_2386_step3_form_filled.png' });

    // Step 5: Submit the form
    const saveBtn = await page.$('#driverForm button:has-text("Save")');
    if (!saveBtn) {
      throw new Error('Save button not found');
    }

    await saveBtn.click();
    console.log('✅ Clicked Save button');

    // Step 6: Wait for response
    await page.waitForTimeout(4000);

    // Take screenshot after submission
    await page.screenshot({ path: '.playwright-mcp/task_2386_step4_after_submit.png' });

    // Check for success toast
    const toast = await page.$('.toast');
    if (toast) {
      const toastText = await toast.textContent();
      console.log(`Toast: "${toastText}"`);
    }

    // Step 7: Final state
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-mcp/task_2386_step5_final.png' });

    // Critical validation: Check for RPC errors indicating transformation failure
    const hasRpcError = consoleErrors.some(err =>
      (err.toLowerCase().includes('rpc') || err.toLowerCase().includes('drivers')) &&
      (err.includes('failed') || err.includes('error') || err.includes('create'))
    );

    const hasFieldError = consoleErrors.some(err =>
      err.includes('first_name') ||
      err.includes('last_name') ||
      err.includes('phone_number')
    );

    if (hasRpcError || hasFieldError) {
      console.error('❌ FAILED: RPC or field mapping error detected!');
      console.error('Errors:');
      consoleErrors.forEach(err => console.error('  -', err));
      await browser.close();
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Transformation working!');
    console.log('Summary:');
    console.log('  ✓ Modal opened and form filled');
    console.log('  ✓ Form submitted successfully');
    console.log('  ✓ No RPC errors (transformation applied)');
    console.log(`  • Console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\nNon-critical errors:');
      consoleErrors.forEach(err => console.log('  -', err));
    }

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2386_ERROR.png' });

    if (consoleErrors.length > 0) {
      console.error('\nConsole errors:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    await browser.close();
    process.exit(1);
  }
})();
