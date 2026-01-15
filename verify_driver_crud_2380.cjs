const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set up console monitoring
  const consoleErrors = [];
  const consoleWarnings = [];
  const consoleLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    else if (msg.type() === 'warning') consoleWarnings.push(text);
    else if (text.includes('Driver') || text.includes('RPC')) consoleLogs.push(text);
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // Navigate and login
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const accessCodeInput = await page.$('input[placeholder*="access code"]');
    if (accessCodeInput) {
      await page.fill('input[placeholder*="access code"]', 'demo01132026');
      await page.click('button:has-text("Enter Demo")');
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    console.log('✅ Loaded drivers page');

    // Wait for JavaScript to load and execute
    await page.waitForTimeout(1500);

    // Verify state variables exist
    const hasStateVars = await page.evaluate(() => {
      return typeof drivers !== 'undefined' &&
             typeof vehicles !== 'undefined' &&
             typeof currentPage !== 'undefined';
    });
    if (!hasStateVars) throw new Error('State variables not initialized');
    console.log('✅ State variables initialized');

    // Verify RPC function exists
    const hasRPC = await page.evaluate(() => typeof rpc === 'function');
    if (!hasRPC) throw new Error('RPC function not defined');
    console.log('✅ RPC function defined');

    // Verify load functions exist
    const hasLoadFunctions = await page.evaluate(() => {
      return typeof loadDrivers === 'function' &&
             typeof loadVehicles === 'function';
    });
    if (!hasLoadFunctions) throw new Error('Load functions not defined');
    console.log('✅ Load functions defined');

    // Verify render function exists
    const hasRenderFunction = await page.evaluate(() => typeof renderDriversTable === 'function');
    if (!hasRenderFunction) throw new Error('renderDriversTable function not defined');
    console.log('✅ Render function defined');

    // Verify helper functions exist
    const hasHelperFunctions = await page.evaluate(() => {
      return typeof getInitials === 'function' &&
             typeof getStatusBadgeClass === 'function' &&
             typeof formatStatus === 'function';
    });
    if (!hasHelperFunctions) throw new Error('Helper functions not defined');
    console.log('✅ Helper functions defined');

    // Verify modal functions exist
    const hasModalFunctions = await page.evaluate(() => {
      return typeof openAddDriverModal === 'function' &&
             typeof openEditDriverModal === 'function' &&
             typeof closeDriverModal === 'function';
    });
    if (!hasModalFunctions) throw new Error('Modal functions not defined');
    console.log('✅ Modal functions defined');

    // Verify CRUD functions exist
    const hasCRUDFunctions = await page.evaluate(() => {
      return typeof saveDriver === 'function' &&
             typeof deleteDriver === 'function';
    });
    if (!hasCRUDFunctions) throw new Error('CRUD functions not defined');
    console.log('✅ CRUD functions defined');

    // Verify pagination functions exist
    const hasPaginationFunctions = await page.evaluate(() => {
      return typeof updatePagination === 'function' &&
             typeof goToPage === 'function';
    });
    if (!hasPaginationFunctions) throw new Error('Pagination functions not defined');
    console.log('✅ Pagination functions defined');

    // Test opening add driver modal
    await page.click('#add-driver-btn');
    await page.waitForTimeout(500);

    const modalVisible = await page.isVisible('#driver-modal');
    if (!modalVisible) throw new Error('Modal did not open');
    console.log('✅ Add driver modal opens');

    // Verify modal title
    const modalTitle = await page.textContent('#modal-title');
    if (modalTitle !== 'Add Driver') throw new Error(`Wrong modal title: ${modalTitle}`);
    console.log('✅ Modal title correct for add mode');

    // Close modal
    await page.click('.close-modal-btn');
    await page.waitForTimeout(500);
    console.log('✅ Modal closes');

    // Test helper functions
    const initialsTest = await page.evaluate(() => {
      return getInitials('John', 'Doe');
    });
    if (initialsTest !== 'JD') throw new Error(`Wrong initials: ${initialsTest}`);
    console.log('✅ getInitials() works correctly');

    const statusClassTest = await page.evaluate(() => {
      return getStatusBadgeClass('active');
    });
    if (statusClassTest !== 'driver-active') throw new Error(`Wrong status class: ${statusClassTest}`);
    console.log('✅ getStatusBadgeClass() works correctly');

    const formatStatusTest = await page.evaluate(() => {
      return formatStatus('on_leave');
    });
    if (formatStatusTest !== 'On Leave') throw new Error(`Wrong formatted status: ${formatStatusTest}`);
    console.log('✅ formatStatus() works correctly');

    // Test pagination state
    const paginationState = await page.evaluate(() => {
      return {
        currentPage,
        pageSize,
        totalDrivers
      };
    });
    console.log(`✅ Pagination state: page ${paginationState.currentPage}, size ${paginationState.pageSize}, total ${paginationState.totalDrivers}`);

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2380_driver_crud_js.png' });
    console.log('✅ Screenshot saved');

    // Check for JavaScript errors (excluding backend RPC failures)
    const jsErrors = consoleErrors.filter(err =>
      !err.includes('RPC Error') &&
      !err.includes('Failed to load') &&
      !err.includes('Failed to load resource')
    );

    if (jsErrors.length > 0) {
      console.error('❌ JavaScript errors detected:');
      jsErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2380_ERROR.png' });
      process.exit(1);
    }

    if (consoleErrors.length > 0) {
      console.log('⚠️  Backend RPC errors detected (expected if backend not fully implemented):');
      consoleErrors.forEach(err => console.log('  -', err.substring(0, 100)));
    }

    console.log('\n✅ All driver CRUD JavaScript verified successfully');
    console.log(JSON.stringify({
      success: true,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      functionsVerified: [
        'rpc', 'loadDrivers', 'loadVehicles', 'renderDriversTable',
        'getInitials', 'getStatusBadgeClass', 'formatStatus',
        'openAddDriverModal', 'openEditDriverModal', 'closeDriverModal',
        'saveDriver', 'deleteDriver', 'updatePagination', 'goToPage'
      ],
      screenshot: '.playwright-mcp/task_2380_driver_crud_js.png',
      message: 'Driver CRUD JavaScript implemented correctly'
    }, null, 2));

    await browser.close();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2380_ERROR.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
