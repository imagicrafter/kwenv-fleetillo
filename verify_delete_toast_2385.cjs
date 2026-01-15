const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // Login
    console.log('Logging in...');
    await page.request.post('http://localhost:8080/api/login', {
      data: { password: 'demo01132026' }
    });

    // Navigate to drivers page
    console.log('Navigating to drivers page...');
    await page.goto('http://localhost:8080/drivers.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-mcp/task_2385_initial.png' });

    // Check if showToast function exists
    const showToastExists = await page.evaluate(() => typeof showToast === 'function');
    if (!showToastExists) {
      throw new Error('showToast function not found');
    }
    console.log('✅ showToast function exists');

    // Check if delete modal exists
    const deleteModal = await page.$('#delete-confirm-modal');
    if (!deleteModal) {
      throw new Error('Delete confirmation modal not found');
    }
    console.log('✅ Delete confirmation modal exists');

    // Check if toast container exists
    const toastContainer = await page.$('#toast-container');
    if (!toastContainer) {
      throw new Error('Toast container not found');
    }
    console.log('✅ Toast container exists');

    // Test toast notification
    console.log('\nTesting toast notification...');
    await page.evaluate(() => {
      showToast('Test success message', 'success');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2385_toast_success.png' });

    const toastVisible = await page.$('.toast.success');
    if (!toastVisible) {
      throw new Error('Success toast not visible');
    }
    console.log('✅ Success toast displays correctly');

    // Test error toast
    await page.evaluate(() => {
      showToast('Test error message', 'error');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2385_toast_error.png' });

    const errorToastVisible = await page.$('.toast.error');
    if (!errorToastVisible) {
      throw new Error('Error toast not visible');
    }
    console.log('✅ Error toast displays correctly');

    // Wait for toasts to auto-dismiss
    await page.waitForTimeout(3500);

    // Test delete confirmation modal (programmatically)
    console.log('\nTesting delete confirmation modal...');
    await page.evaluate(() => {
      // Create a mock driver in the drivers array
      window.drivers = [{ id: 999, first_name: 'Test', last_name: 'Driver' }];
      deleteDriver(999);
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2385_delete_modal.png' });

    const modalVisible = await page.evaluate(() => {
      const modal = document.getElementById('delete-confirm-modal');
      return modal && modal.style.display === 'block';
    });

    if (!modalVisible) {
      throw new Error('Delete modal did not open');
    }
    console.log('✅ Delete confirmation modal opens');

    // Check modal content
    const driverName = await page.textContent('#delete-driver-name');
    if (driverName !== 'Test Driver') {
      throw new Error('Driver name not set correctly in modal');
    }
    console.log('✅ Driver name displayed in modal:', driverName);

    // Test cancel button
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(300);

    const modalClosed = await page.evaluate(() => {
      const modal = document.getElementById('delete-confirm-modal');
      return modal.style.display === 'none';
    });

    if (!modalClosed) {
      throw new Error('Modal did not close on cancel');
    }
    console.log('✅ Cancel button closes modal');

    await page.screenshot({ path: '.playwright-mcp/task_2385_complete.png' });

    // Filter critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('RPC Error') &&
      !err.includes('Failed to load') &&
      !err.includes('400 (Bad Request)') &&
      !err.includes('Failed to load resource')
    );

    if (criticalErrors.length > 0) {
      console.error('⚠️  Console errors:');
      criticalErrors.forEach(err => console.error('  -', err));
    }

    console.log('\n✅ Task 2385 complete - Delete modal and toasts verified!');
    console.log(JSON.stringify({
      success: true,
      toastFunctionWorks: true,
      deleteModalWorks: true,
      cancelWorks: true,
      consoleErrors: criticalErrors.length
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2385_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
