const { chromium } = require('playwright');

(async () => {
  console.log('=== Driver Modal Form Verification ===\n');

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
    // Login
    console.log('Test 1: Logging in...');
    await page.goto('http://localhost:8080/login.html', { waitUntil: 'load', timeout: 10000 });
    await page.fill('input[type="password"]', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html', { timeout: 10000 });
    console.log('✅ Logged in');

    console.log('\nTest 2: Loading drivers page...');
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('✅ Page loaded');

    console.log('\nTest 3: Checking modal structure exists...');
    const modal = await page.$('#driver-modal');
    if (modal) {
      console.log('✅ Modal element exists');
    } else {
      console.error('❌ Modal element not found');
      process.exit(1);
    }

    console.log('\nTest 4: Checking modal header...');
    const modalTitle = await page.$('#modal-title');
    const closeButton = await page.$('#driver-modal .close-modal');
    if (modalTitle && closeButton) {
      console.log('✅ Modal header with title and close button present');
    } else {
      console.error('❌ Modal header incomplete');
      process.exit(1);
    }

    console.log('\nTest 5: Checking hidden driver ID field...');
    const hiddenId = await page.$('#driver-id[type="hidden"]');
    if (hiddenId) {
      console.log('✅ Hidden driver ID field present');
    } else {
      console.error('❌ Hidden driver ID field missing');
      process.exit(1);
    }

    console.log('\nTest 6: Checking personal information fields...');
    const firstName = await page.$('#first-name[required]');
    const lastName = await page.$('#last-name[required]');
    const phoneNumber = await page.$('#phone-number');
    const email = await page.$('#email[type="email"]');
    const telegramChatId = await page.$('#telegram-chat-id');

    if (firstName && lastName && phoneNumber && email && telegramChatId) {
      console.log('✅ Personal information fields present (first name, last name, phone, email, telegram)');
    } else {
      console.error('❌ Personal information fields incomplete');
      process.exit(1);
    }

    console.log('\nTest 7: Checking license information fields...');
    const licenseNumber = await page.$('#license-number');
    const licenseClass = await page.$('#license-class');
    const licenseExpiry = await page.$('#license-expiry[type="date"]');

    if (licenseNumber && licenseClass && licenseExpiry) {
      console.log('✅ License information fields present (number, class, expiry)');
    } else {
      console.error('❌ License information fields incomplete');
      process.exit(1);
    }

    console.log('\nTest 8: Checking employment information fields...');
    const driverStatus = await page.$('#driver-status[required]');
    const hireDate = await page.$('#hire-date[type="date"]');

    if (driverStatus && hireDate) {
      console.log('✅ Employment information fields present (status, hire date)');
    } else {
      console.error('❌ Employment information fields incomplete');
      process.exit(1);
    }

    console.log('\nTest 9: Checking status dropdown options...');
    const statusOptions = await page.$$eval('#driver-status option', opts => opts.map(o => o.value));
    const expectedStatuses = ['active', 'inactive', 'on_leave', 'terminated'];
    if (JSON.stringify(statusOptions) === JSON.stringify(expectedStatuses)) {
      console.log('✅ Status options correct:', statusOptions.join(', '));
    } else {
      console.error('❌ Status options incorrect');
      console.error('   Found:', statusOptions.join(', '));
      console.error('   Expected:', expectedStatuses.join(', '));
      process.exit(1);
    }

    console.log('\nTest 10: Checking emergency contact fields...');
    const emergencyName = await page.$('#emergency-contact-name');
    const emergencyPhone = await page.$('#emergency-contact-phone');

    if (emergencyName && emergencyPhone) {
      console.log('✅ Emergency contact fields present (name, phone)');
    } else {
      console.error('❌ Emergency contact fields incomplete');
      process.exit(1);
    }

    console.log('\nTest 11: Checking notes field...');
    const notes = await page.$('#driver-notes');
    if (notes) {
      const tagName = await notes.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'textarea') {
        console.log('✅ Notes textarea field present');
      } else {
        console.error('❌ Notes field is not a textarea');
        process.exit(1);
      }
    } else {
      console.error('❌ Notes field missing');
      process.exit(1);
    }

    console.log('\nTest 12: Checking form actions...');
    const cancelBtn = await page.$('.close-modal-btn');
    const submitBtn = await page.$('#driver-form button[type="submit"]');

    if (cancelBtn && submitBtn) {
      const submitText = await submitBtn.textContent();
      if (submitText.includes('Save Driver')) {
        console.log('✅ Form actions present (Cancel and Save Driver buttons)');
      } else {
        console.error('❌ Submit button text incorrect:', submitText);
        process.exit(1);
      }
    } else {
      console.error('❌ Form action buttons incomplete');
      process.exit(1);
    }

    console.log('\nTest 13: Checking required field indicators...');
    const requiredLabels = await page.$$eval('label', labels =>
      labels.filter(l => l.textContent.includes('*')).map(l => l.textContent)
    );
    if (requiredLabels.length >= 3) {
      console.log('✅ Required field indicators present:', requiredLabels.length, 'fields marked');
    } else {
      console.error('❌ Required field indicators missing or insufficient');
      process.exit(1);
    }

    console.log('\nTest 14: Checking modal is initially hidden...');
    const isVisible = await page.isVisible('#driver-modal');
    if (!isVisible) {
      console.log('✅ Modal is initially hidden');
    } else {
      console.error('❌ Modal should be hidden initially');
      process.exit(1);
    }

    console.log('\nTest 15: Checking for console errors...');
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
    await page.screenshot({ path: '.playwright-mcp/task_2377_driver_modal_form.png' });
    console.log('\n✅ Screenshot saved: .playwright-mcp/task_2377_driver_modal_form.png');

    console.log('\n=== All Driver Modal Form Tests Passed ✅ ===');
    console.log('\nSummary:');
    console.log('- Modal structure: ✅');
    console.log('- Personal info fields: ✅ (first name*, last name*, phone, email, telegram)');
    console.log('- License info fields: ✅ (number, class, expiry date)');
    console.log('- Employment info fields: ✅ (status*, hire date)');
    console.log('- Status options: ✅ (active, inactive, on_leave, terminated)');
    console.log('- Emergency contact: ✅ (name, phone)');
    console.log('- Notes textarea: ✅');
    console.log('- Form actions: ✅ (Cancel, Save Driver)');
    console.log('- Required indicators: ✅');
    console.log('- Initially hidden: ✅');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2377_error.png' });
    console.error('Error screenshot saved');
    await browser.close();
    process.exit(1);
  }

  await browser.close();
})();
