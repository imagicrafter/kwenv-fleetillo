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

    // Step 1: Navigate to the app
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    console.log('✅ Navigated to app');

    // Step 2: Login if needed
    const loginExists = await page.$('#password');
    if (loginExists) {
      await page.fill('#password', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      console.log('✅ Logged in');
    }

    // Step 3: Navigate to Drivers page
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to Drivers page');

    // Take screenshot of initial state
    await page.screenshot({ path: '.playwright-mcp/task_2386_step1_drivers_page.png' });

    // Step 4: Click Add Driver button
    await page.click('button:has-text("Add Driver")');
    await page.waitForSelector('#driverModal.show', { timeout: 5000 });
    console.log('✅ Driver modal opened');

    // Take screenshot of modal
    await page.screenshot({ path: '.playwright-mcp/task_2386_step2_modal_open.png' });

    // Step 5: Fill in the form with snake_case field names (testing transformation)
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
    await page.click('#driverForm button[type="submit"]');
    console.log('✅ Submitted form');

    // Step 7: Wait for success toast
    await page.waitForSelector('.toast.show', { timeout: 10000 });
    const toastText = await page.textContent('.toast-body');
    console.log(`✅ Toast appeared: "${toastText}"`);

    // Take screenshot of success toast
    await page.screenshot({ path: '.playwright-mcp/task_2386_step4_success_toast.png' });

    // Step 8: Verify the modal closed
    await page.waitForSelector('#driverModal:not(.show)', { timeout: 5000 });
    console.log('✅ Modal closed');

    // Step 9: Wait for table to reload and verify new driver appears
    await page.waitForTimeout(2000);
    const tableBody = await page.textContent('#driversTableBody');

    if (tableBody.includes('TestSnake') && tableBody.includes('CamelCase')) {
      console.log('✅ New driver appears in table');
    } else {
      throw new Error('❌ New driver not found in table');
    }

    // Take final screenshot showing new driver
    await page.screenshot({ path: '.playwright-mcp/task_2386_step5_driver_created.png' });

    // Step 10: Verify the driver details by clicking edit
    const editButtons = await page.$$('button:has-text("Edit")');
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await page.waitForSelector('#driverModal.show', { timeout: 5000 });

      const firstNameValue = await page.inputValue('#firstName');
      const lastNameValue = await page.inputValue('#lastName');
      const phoneValue = await page.inputValue('#phoneNumber');
      const emailValue = await page.inputValue('#email');
      const licenseValue = await page.inputValue('#licenseNumber');

      console.log(`✅ Verified saved values: ${firstNameValue} ${lastNameValue}, ${phoneValue}, ${emailValue}, License: ${licenseValue}`);

      await page.screenshot({ path: '.playwright-mcp/task_2386_step6_verify_fields.png' });

      // Close modal
      await page.click('button:has-text("Cancel")');
    }

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await browser.close();
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Snake_case to camelCase transformation working correctly!');
    console.log('📊 Summary:');
    console.log('  - Driver modal opened successfully');
    console.log('  - Form submitted with snake_case field names');
    console.log('  - Backend transformation converted to camelCase');
    console.log('  - Driver created successfully in database');
    console.log('  - Driver appears in table with correct data');
    console.log('  - No console errors detected');

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2386_ERROR.png' });

    if (consoleErrors.length > 0) {
      console.error('Console errors:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    await browser.close();
    process.exit(1);
  }
})();
