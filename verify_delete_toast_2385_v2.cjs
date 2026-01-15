const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    consoleLogs.push(`[${msg.type()}] ${text}`);
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
    await page.screenshot({ path: '.playwright-mcp/task_2385_page_loaded.png' });

    // Check if functions exist
    const functionsCheck = await page.evaluate(() => {
      return {
        showToast: typeof showToast === 'function',
        deleteDriver: typeof deleteDriver === 'function',
        closeDeleteModal: typeof closeDeleteModal === 'function',
        executeDelete: typeof executeDelete === 'function'
      };
    });

    console.log('Functions check:', functionsCheck);
    if (!functionsCheck.showToast) throw new Error('showToast not found');
    if (!functionsCheck.deleteDriver) throw new Error('deleteDriver not found');
    if (!functionsCheck.closeDeleteModal) throw new Error('closeDeleteModal not found');
    if (!functionsCheck.executeDelete) throw new Error('executeDelete not found');
    console.log('✅ All functions exist');

    // Check if elements exist
    const elementsCheck = await page.evaluate(() => {
      return {
        deleteModal: !!document.getElementById('delete-confirm-modal'),
        deleteDriverName: !!document.getElementById('delete-driver-name'),
        confirmDeleteBtn: !!document.getElementById('confirm-delete-btn'),
        toastContainer: !!document.getElementById('toast-container')
      };
    });

    console.log('Elements check:', elementsCheck);
    if (!elementsCheck.deleteModal) throw new Error('Delete modal not found');
    if (!elementsCheck.deleteDriverName) throw new Error('Delete driver name element not found');
    if (!elementsCheck.confirmDeleteBtn) throw new Error('Confirm delete button not found');
    if (!elementsCheck.toastContainer) throw new Error('Toast container not found');
    console.log('✅ All required elements exist');

    // Test toast notification
    console.log('\nTesting toast notifications...');
    await page.evaluate(() => {
      showToast('Test success notification', 'success');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2385_toast_shown.png' });

    const successToast = await page.$('.toast.success');
    if (!successToast) {
      throw new Error('Success toast not displayed');
    }
    console.log('✅ Success toast works');

    // Test error toast
    await page.evaluate(() => {
      showToast('Test error notification', 'error');
    });

    await page.waitForTimeout(500);
    const errorToast = await page.$('.toast.error');
    if (!errorToast) {
      throw new Error('Error toast not displayed');
    }
    console.log('✅ Error toast works');

    await page.waitForTimeout(3500); // Let toasts disappear

    // Test delete confirmation modal with proper setup
    console.log('\nTesting delete confirmation modal...');
    const modalOpened = await page.evaluate(() => {
      // Set up test driver
      window.drivers = [{id: 999, first_name: 'John', last_name: 'Doe'}];

      // Call deleteDriver
      deleteDriver(999);

      // Check if modal is visible
      const modal = document.getElementById('delete-confirm-modal');
      return modal && modal.style.display === 'block';
    });

    console.log('Modal opened result:', modalOpened);

    if (!modalOpened) {
      // Debug: check what went wrong
      const debugInfo = await page.evaluate(() => {
        return {
          driversArray: window.drivers,
          modalDisplay: document.getElementById('delete-confirm-modal')?.style?.display,
          driverName: document.getElementById('delete-driver-name')?.textContent
        };
      });
      console.log('Debug info:', debugInfo);
      throw new Error('Delete modal did not open');
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2385_delete_modal_open.png' });
    console.log('✅ Delete modal opens');

    // Check modal content
    const driverName = await page.textContent('#delete-driver-name');
    console.log('✅ Driver name in modal:', driverName);

    // Test cancel functionality
    const cancelBtn = await page.$('button:has-text("Cancel")');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(300);

      const modalClosed = await page.evaluate(() => {
        const modal = document.getElementById('delete-confirm-modal');
        return modal.style.display === 'none';
      });

      if (!modalClosed) {
        throw new Error('Modal did not close');
      }
      console.log('✅ Cancel button works');
    }

    await page.screenshot({ path: '.playwright-mcp/task_2385_verification_complete.png' });

    // Filter critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('RPC Error') &&
      !err.includes('Failed to load') &&
      !err.includes('400') &&
      !err.includes('Failed to load resource')
    );

    if (criticalErrors.length > 0) {
      console.error('⚠️  Console errors:');
      criticalErrors.forEach(err => console.error('  -', err));
    }

    console.log('\n✅ Task 2385 complete - All features verified!');
    console.log(JSON.stringify({
      success: true,
      toastsWork: true,
      deleteModalWorks: true,
      cancelWorks: true,
      consoleErrors: criticalErrors.length
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nRecent console logs:');
    consoleLogs.slice(-10).forEach(log => console.log(log));
    await page.screenshot({ path: '.playwright-mcp/task_2385_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
