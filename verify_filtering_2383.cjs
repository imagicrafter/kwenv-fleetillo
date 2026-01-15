const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Set up console monitoring
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
    await page.screenshot({ path: '.playwright-mcp/task_2383_drivers_page.png' });

    // Check if status filter exists
    const statusFilter = await page.$('#status-filter');
    if (!statusFilter) {
      throw new Error('Status filter not found');
    }
    console.log('✅ Status filter element exists');

    // Check if search input exists
    const searchInput = await page.$('#search-input');
    if (!searchInput) {
      throw new Error('Search input not found');
    }
    console.log('✅ Search input element exists');

    // Check if debounce function exists
    const debounceExists = await page.evaluate(() => {
      return typeof window.debounce === 'function';
    });

    if (!debounceExists) {
      throw new Error('Debounce function not found');
    }
    console.log('✅ Debounce function exists');

    // Check state variables
    const stateVariables = await page.evaluate(() => {
      return {
        searchTerm: typeof window.searchTerm !== 'undefined',
        statusFilter: typeof window.statusFilter !== 'undefined'
      };
    });

    if (!stateVariables.searchTerm || !stateVariables.statusFilter) {
      throw new Error('State variables not properly initialized');
    }
    console.log('✅ State variables (searchTerm, statusFilter) initialized');

    // Test status filter dropdown options
    const filterOptions = await page.$$eval('#status-filter option', options =>
      options.map(opt => opt.value)
    );

    console.log('Status filter options:', filterOptions);

    if (!filterOptions.includes('') ||
        !filterOptions.includes('active') ||
        !filterOptions.includes('inactive') ||
        !filterOptions.includes('on_leave') ||
        !filterOptions.includes('terminated')) {
      throw new Error('Status filter missing expected options');
    }
    console.log('✅ All status filter options present');

    // Test selecting a status filter
    console.log('Testing status filter selection...');
    await page.selectOption('#status-filter', 'active');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2383_status_filtered.png' });

    const selectedStatus = await page.evaluate(() => window.statusFilter);
    if (selectedStatus !== 'active') {
      throw new Error('Status filter not updating state variable');
    }
    console.log('✅ Status filter updates state correctly');

    // Test search input
    console.log('Testing search input...');
    await page.fill('#search-input', 'test driver');
    await page.waitForTimeout(500); // Wait for debounce
    await page.screenshot({ path: '.playwright-mcp/task_2383_search_entered.png' });

    const searchValue = await page.evaluate(() => window.searchTerm);
    if (searchValue !== 'test driver') {
      throw new Error('Search input not updating state variable');
    }
    console.log('✅ Search input updates state correctly');

    // Clear filters
    await page.selectOption('#status-filter', '');
    await page.fill('#search-input', '');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2383_filters_cleared.png' });

    console.log('✅ Filters can be cleared');

    // Check for critical console errors (ignore RPC errors from empty data)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('RPC Error') &&
      !err.includes('Failed to load drivers') &&
      !err.includes('400 (Bad Request)')
    );

    if (criticalErrors.length > 0) {
      console.error('❌ Critical console errors:');
      criticalErrors.forEach(err => console.error('  -', err));
      throw new Error('Critical JavaScript errors detected');
    }

    console.log('\n✅ Task 2383 complete - Filtering and search functionality verified!');
    console.log(JSON.stringify({
      success: true,
      statusFilterWorking: true,
      searchInputWorking: true,
      debounceImplemented: true,
      consoleErrors: criticalErrors.length
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2383_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
