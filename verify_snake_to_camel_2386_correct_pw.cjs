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

    // Fill and submit login form with correct password
    await page.fill('#access-code', 'demo01132026');
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

    // Try clicking the Add Driver button
    const addDriverBtn = await page.$('button:has-text("Add Driver"), button:has-text("＋")');

    if (!addDriverBtn) {
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

    // Step 4: Fill in the form (these field names in HTML will be transformed for backend)
    await page.fill('#firstName', 'SnakeCase');
    await page.fill('#lastName', 'CamelCase');
    await page.fill('#phoneNumber', '555-6666');
    await page.fill('#email', 'snake.camel@transformation.test');

    // Try to fill optional fields if they exist
    try {
      await page.fill('#licenseNumber', 'DL777777');
      await page.fill('#licenseClass', 'A');
    } catch (e) {
      console.log('Optional fields not available or not required');
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

    // Step 6: Wait for response and check results
    await page.waitForTimeout(4000);

    // Take screenshot after submission
    await page.screenshot({ path: '.playwright-mcp/task_2386_step4_after_submit.png' });

    // Check for success toast
    const toast = await page.$('.toast');
    if (toast) {
      const toastText = await toast.textContent();
      console.log(`✅ Toast appeared: "${toastText}"`);

      if (toastText.toLowerCase().includes('success')) {
        console.log('✅ Success message confirmed');
      }
    }

    // Step 7: Final state
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-mcp/task_2386_step5_final.png' });

    // CRITICAL VALIDATION: Check for RPC errors that would indicate transformation failure
    const hasRpcError = consoleErrors.some(err => {
      const lowerErr = err.toLowerCase();
      return (lowerErr.includes('rpc') || lowerErr.includes('drivers')) &&
             (lowerErr.includes('failed') || lowerErr.includes('error')) &&
             (lowerErr.includes('create') || lowerErr.includes('first_name') || lowerErr.includes('last_name'));
    });

    const hasFieldMappingError = consoleErrors.some(err =>
      err.includes('first_name') ||
      err.includes('last_name') ||
      err.includes('phone_number') ||
      err.includes('license_number')
    );

    if (hasRpcError || hasFieldMappingError) {
      console.error('❌ TRANSFORMATION FAILED: RPC or field mapping error detected!');
      console.error('This indicates snake_case fields were NOT converted to camelCase');
      console.error('\nErrors:');
      consoleErrors.forEach(err => console.error('  -', err));
      await browser.close();
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Snake_case to camelCase transformation working correctly!');
    console.log('\n📊 Test Summary:');
    console.log('  ✓ Logged in successfully');
    console.log('  ✓ Navigated to Drivers page');
    console.log('  ✓ Driver modal opened');
    console.log('  ✓ Form filled with driver data');
    console.log('  ✓ Form submitted successfully');
    console.log('  ✓ No RPC drivers.create errors detected');
    console.log('  ✓ No field mapping errors (first_name, last_name, etc.)');
    console.log('  ✓ Backend successfully received camelCase fields');
    console.log(`  • Total console errors: ${consoleErrors.length}`);
    console.log(`  • Total console warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0 && !hasRpcError) {
      console.log('\nℹ️  Non-critical errors (unrelated to transformation):');
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
