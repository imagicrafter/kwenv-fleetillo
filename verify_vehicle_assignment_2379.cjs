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
    // Navigate to drivers page
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Handle login if needed
    const accessCodeInput = await page.$('input[placeholder*="access code"]');
    if (accessCodeInput) {
      console.log('Logging in...');
      await page.fill('input[placeholder*="access code"]', 'demo01132026');
      await page.click('button:has-text("Enter Demo")');
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }

    console.log('✅ Loaded drivers page');

    // Open driver modal
    await page.waitForSelector('#add-driver-btn', { timeout: 5000 });
    await page.click('#add-driver-btn');
    await page.waitForTimeout(500);
    console.log('✅ Driver modal opened');

    // Verify Vehicle Assignment section exists in driver modal
    const vehicleSection = await page.$('.form-section:has(.section-title:has-text("Vehicle Assignment"))');
    if (!vehicleSection) {
      throw new Error('Vehicle Assignment section not found in driver modal');
    }
    console.log('✅ Vehicle Assignment section present in driver modal');

    // Verify section title styling
    const sectionTitle = await page.$('.section-title');
    if (!sectionTitle) throw new Error('Section title not found');
    const sectionTitleText = await sectionTitle.textContent();
    // Text content will be "Vehicle Assignment", but CSS transforms it to uppercase
    if (!sectionTitleText.toLowerCase().includes('vehicle assignment')) {
      throw new Error(`Wrong section title: ${sectionTitleText}`);
    }
    console.log('✅ Section title "Vehicle Assignment" present');

    // Verify section title CSS
    const titleStyles = await sectionTitle.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        textTransform: styles.textTransform,
        letterSpacing: styles.letterSpacing
      };
    });
    if (titleStyles.textTransform !== 'uppercase') {
      throw new Error('Section title should be uppercase');
    }
    console.log('✅ Section title CSS styling correct');

    // Verify assigned vehicle dropdown
    const vehicleDropdown = await page.$('#assigned-vehicle');
    if (!vehicleDropdown) throw new Error('Assigned vehicle dropdown not found');
    console.log('✅ Assigned vehicle dropdown present');

    // Verify dropdown has default option
    const defaultOption = await page.$('#assigned-vehicle option[value=""]');
    if (!defaultOption) throw new Error('Default "No Vehicle Assigned" option not found');
    const defaultOptionText = await defaultOption.textContent();
    if (!defaultOptionText.includes('No Vehicle Assigned')) {
      throw new Error(`Wrong default option text: ${defaultOptionText}`);
    }
    console.log('✅ Default "No Vehicle Assigned" option present');

    // Verify dropdown label
    const vehicleLabel = await page.$('label[for="assigned-vehicle"]');
    if (!vehicleLabel) throw new Error('Vehicle dropdown label not found');
    const labelText = await vehicleLabel.textContent();
    if (labelText !== 'Assigned Vehicle') {
      throw new Error(`Wrong label text: ${labelText}`);
    }
    console.log('✅ Vehicle dropdown label correct');

    // Take screenshot of driver modal with vehicle assignment
    await page.screenshot({ path: '.playwright-mcp/task_2379_driver_modal_vehicle.png' });
    console.log('✅ Driver modal screenshot saved');

    // Close driver modal via JavaScript
    await page.evaluate(() => {
      const modal = document.getElementById('driver-modal');
      if (modal) modal.style.display = 'none';
    });
    await page.waitForTimeout(500);

    // Verify separate Vehicle Assignment Modal exists
    const vehicleAssignModal = await page.$('#vehicle-assign-modal');
    if (!vehicleAssignModal) {
      throw new Error('Vehicle assignment modal not found');
    }
    console.log('✅ Separate vehicle assignment modal present');

    // Open vehicle assignment modal directly
    await page.evaluate(() => {
      const modal = document.getElementById('vehicle-assign-modal');
      if (modal) modal.style.display = 'block';
    });
    await page.waitForTimeout(500);

    // Verify modal title
    const modalTitle = await page.$('#vehicle-assign-modal h3');
    if (!modalTitle) throw new Error('Vehicle assignment modal title not found');
    const modalTitleText = await modalTitle.textContent();
    if (modalTitleText !== 'Assign Vehicle') {
      throw new Error(`Wrong modal title: ${modalTitleText}`);
    }
    console.log('✅ Vehicle assignment modal title correct');

    // Verify driver name display
    const driverNameDisplay = await page.$('#assign-driver-name');
    if (!driverNameDisplay) throw new Error('Driver name display element not found');
    console.log('✅ Driver name display element present');

    // Verify vehicle select dropdown in modal
    const vehicleSelect = await page.$('#vehicle-select');
    if (!vehicleSelect) throw new Error('Vehicle select dropdown not found in modal');
    console.log('✅ Vehicle select dropdown present in modal');

    // Verify vehicle select has default option
    const modalDefaultOption = await page.$('#vehicle-select option[value=""]');
    if (!modalDefaultOption) throw new Error('Default option not found in vehicle select');
    console.log('✅ Default option present in vehicle select');

    // Verify modal buttons
    const cancelBtn = await page.$('#vehicle-assign-modal button:has-text("Cancel")');
    if (!cancelBtn) throw new Error('Cancel button not found');
    console.log('✅ Cancel button present');

    const assignBtn = await page.$('#vehicle-assign-modal button:has-text("Assign")');
    if (!assignBtn) throw new Error('Assign button not found');
    console.log('✅ Assign button present');

    // Take screenshot of vehicle assignment modal
    await page.screenshot({ path: '.playwright-mcp/task_2379_vehicle_assign_modal.png' });
    console.log('✅ Vehicle assignment modal screenshot saved');

    // Check console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2379_ERROR.png' });
      process.exit(1);
    }

    console.log('\n✅ All vehicle assignment components verified successfully');
    console.log(JSON.stringify({
      success: true,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      screenshots: [
        '.playwright-mcp/task_2379_driver_modal_vehicle.png',
        '.playwright-mcp/task_2379_vehicle_assign_modal.png'
      ],
      message: 'Vehicle assignment modal and dropdown implemented correctly'
    }, null, 2));

    await browser.close();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2379_ERROR.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
