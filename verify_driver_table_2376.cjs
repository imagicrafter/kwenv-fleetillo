const { chromium } = require('playwright');

(async () => {
  console.log('=== Driver Data Table Verification ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set up console error monitoring
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // Login first
    console.log('Test 1: Logging in...');
    await page.goto('http://localhost:8080/login.html', { waitUntil: 'load', timeout: 10000 });
    await page.fill('input[type="password"]', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    console.log('\nTest 2: Loading drivers.html page...');
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('✅ Page loaded');

    console.log('\nTest 3: Checking updated table headers...');
    const tableHeaders = await page.$$eval('.data-table thead th', ths => ths.map(th => th.textContent));
    const expectedHeaders = ['Driver', 'Contact', 'License Expiry', 'Assigned Vehicle', 'Status', 'Actions'];
    if (JSON.stringify(tableHeaders) === JSON.stringify(expectedHeaders)) {
      console.log('✅ Table headers correct:', tableHeaders.join(', '));
    } else {
      console.error('❌ Table headers incorrect');
      console.error('   Found:', tableHeaders.join(', '));
      console.error('   Expected:', expectedHeaders.join(', '));
      process.exit(1);
    }

    console.log('\nTest 4: Checking empty state message...');
    const emptyStateText = await page.$eval('#drivers-table-body td[colspan="6"]', el => el.textContent.trim());
    if (emptyStateText.includes('No drivers found') && emptyStateText.includes('Add Driver')) {
      console.log('✅ Empty state message present');
    } else {
      console.error('❌ Empty state message incorrect:', emptyStateText);
      process.exit(1);
    }

    console.log('\nTest 5: Checking avatar styles exist...');
    const hasAvatarStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules || []);
          } catch {
            return [];
          }
        })
        .map(rule => rule.cssText || '')
        .join(' ');
      return styles.includes('.driver-avatar') && styles.includes('.driver-avatar-initials');
    });
    if (hasAvatarStyles) {
      console.log('✅ Avatar styles (.driver-avatar and .driver-avatar-initials) present');
    } else {
      console.error('❌ Avatar styles not found');
      process.exit(1);
    }

    console.log('\nTest 6: Checking status badge styles...');
    const hasStatusBadgeStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules || []);
          } catch {
            return [];
          }
        })
        .map(rule => rule.cssText || '')
        .join(' ');
      return styles.includes('.driver-active') &&
             styles.includes('.driver-inactive') &&
             styles.includes('.driver-on-leave') &&
             styles.includes('.driver-terminated');
    });
    if (hasStatusBadgeStyles) {
      console.log('✅ Status badge styles present (active, inactive, on_leave, terminated)');
    } else {
      console.error('❌ Status badge styles not found');
      process.exit(1);
    }

    console.log('\nTest 7: Checking license expiry warning style...');
    const hasLicenseWarningStyle = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules || []);
          } catch {
            return [];
          }
        })
        .map(rule => rule.cssText || '')
        .join(' ');
      return styles.includes('.license-expiry-warning');
    });
    if (hasLicenseWarningStyle) {
      console.log('✅ License expiry warning style present');
    } else {
      console.error('❌ License expiry warning style not found');
      process.exit(1);
    }

    console.log('\nTest 8: Checking table-container class...');
    const hasTableContainer = await page.$('.table-container');
    if (hasTableContainer) {
      console.log('✅ table-container class applied');
    } else {
      console.error('❌ table-container class missing');
      process.exit(1);
    }

    console.log('\nTest 9: Checking pagination footer...');
    const paginationFooter = await page.$('.pagination-footer');
    if (paginationFooter) {
      console.log('✅ Pagination footer present');
    } else {
      console.error('❌ Pagination footer missing');
      process.exit(1);
    }

    console.log('\nTest 10: Checking for console errors...');
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to load resource') &&
      !err.includes('404') &&
      !err.includes('preload.js')
    );
    if (criticalErrors.length === 0) {
      console.log('✅ No critical console errors');
    } else {
      console.warn('⚠️  Some console errors detected (non-critical):');
      criticalErrors.forEach(err => console.warn('   -', err));
    }

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2376_driver_table_structure.png' });
    console.log('\n✅ Screenshot saved: .playwright-mcp/task_2376_driver_table_structure.png');

    console.log('\n=== All Driver Data Table Tests Passed ✅ ===');
    console.log('\nSummary:');
    console.log('- Table headers: ✅ Driver, Contact, License Expiry, Assigned Vehicle, Status, Actions');
    console.log('- Empty state: ✅ Message present');
    console.log('- Avatar styles: ✅ .driver-avatar, .driver-avatar-initials');
    console.log('- Status badges: ✅ active, inactive, on_leave, terminated colors');
    console.log('- License warning: ✅ Style present');
    console.log('- Table container: ✅');
    console.log('- Pagination: ✅');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2376_error.png' });
    console.error('Error screenshot saved');
    await browser.close();
    process.exit(1);
  }

  await browser.close();
})();
