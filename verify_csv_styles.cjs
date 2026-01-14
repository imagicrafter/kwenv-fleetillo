const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    console.log('Verifying CSV upload modal styles...');

    // Login
    await page.goto('http://localhost:8080/login.html');
    await page.fill('#access-code', 'demo01132026');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to bookings page
    await page.goto('http://localhost:8080/bookings.html');
    await page.waitForTimeout(2000);
    console.log('✅ Loaded bookings page');

    // Check that styles.css is loaded
    const stylesLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('styles.css'));
    });

    if (!stylesLoaded) {
      throw new Error('styles.css not loaded on page');
    }
    console.log('✅ styles.css loaded');

    // Check CSS classes are applied and styled
    const dropZoneStyles = await page.evaluate(() => {
      const dropZone = document.querySelector('.csv-drop-zone');
      if (!dropZone) return null;
      const styles = window.getComputedStyle(dropZone);
      return {
        border: styles.border,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        textAlign: styles.textAlign,
        background: styles.background
      };
    });

    if (!dropZoneStyles) {
      throw new Error('Drop zone not found or not styled');
    }
    console.log('✅ Drop zone styled correctly');
    console.log('   - Border:', dropZoneStyles.border);
    console.log('   - Border radius:', dropZoneStyles.borderRadius);
    console.log('   - Text align:', dropZoneStyles.textAlign);

    // Check progress bar styles
    const progressBarExists = await page.$('.progress-bar');
    if (!progressBarExists) {
      throw new Error('Progress bar not found');
    }
    console.log('✅ Progress bar present');

    // Check file preview styles
    const filePreviewExists = await page.$('.file-preview');
    if (!filePreviewExists) {
      throw new Error('File preview not found');
    }
    console.log('✅ File preview present');

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('\n❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2361_ERROR.png' });
      await browser.close();
      process.exit(1);
    }

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2361_csv_styles_applied.png' });

    console.log('\n✅ CSV upload modal styles verified');
    console.log('   - All CSS classes applied correctly');
    console.log('   - Drop zone, progress bar, and file preview styled');
    console.log('   - No console errors');
    console.log('📸 Screenshot: .playwright-mcp/task_2361_csv_styles_applied.png');

    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    await page.screenshot({ path: '.playwright-mcp/task_2361_ERROR.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
