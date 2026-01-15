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
    // Navigate to drivers page (will redirect to login if not authenticated)
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check if we're on login page
    const accessCodeInput = await page.$('input[placeholder*="access code"]');
    if (accessCodeInput) {
      console.log('Logging in with demo credentials...');
      await page.fill('input[placeholder*="access code"]', 'demo01132026');
      await page.click('button:has-text("Enter Demo")');
      await page.waitForTimeout(2000);
      console.log('✅ Logged in successfully');

      // Navigate to drivers page after login
      await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }

    console.log('✅ Loaded drivers page');

    // Click Add Driver button to open modal
    await page.waitForSelector('#add-driver-btn', { timeout: 5000 });
    await page.click('#add-driver-btn');
    await page.waitForTimeout(500);
    console.log('✅ Driver modal opened');

    // Verify avatar upload section exists
    const avatarSection = await page.$('.avatar-upload-section');
    if (!avatarSection) throw new Error('Avatar upload section not found');
    console.log('✅ Avatar upload section present');

    // Verify avatar preview elements
    const avatarPreview = await page.$('#avatarPreview');
    if (!avatarPreview) throw new Error('Avatar preview not found');
    console.log('✅ Avatar preview container present');

    const avatarImage = await page.$('#avatarImage');
    if (!avatarImage) throw new Error('Avatar image element not found');
    const imageDisplay = await avatarImage.evaluate(el => el.style.display);
    if (imageDisplay !== 'none') throw new Error('Avatar image should be hidden initially');
    console.log('✅ Avatar image element hidden initially');

    const avatarInitials = await page.$('#avatarInitials');
    if (!avatarInitials) throw new Error('Avatar initials element not found');
    console.log('✅ Avatar initials element present');

    // Verify avatar actions buttons
    const avatarInput = await page.$('#avatarInput');
    if (!avatarInput) throw new Error('Avatar file input not found');
    const inputHidden = await avatarInput.evaluate(el => el.hasAttribute('hidden'));
    if (!inputHidden) throw new Error('Avatar input should be hidden');
    const inputAccept = await avatarInput.getAttribute('accept');
    if (inputAccept !== 'image/jpeg,image/png,image/webp') {
      throw new Error(`Wrong accept attribute: ${inputAccept}`);
    }
    console.log('✅ Avatar file input configured correctly');

    const uploadBtn = await page.$('#uploadAvatarBtn');
    if (!uploadBtn) throw new Error('Upload photo button not found');
    const uploadBtnText = await uploadBtn.textContent();
    if (uploadBtnText !== 'Upload Photo') throw new Error('Wrong upload button text');
    console.log('✅ Upload Photo button present');

    const removeBtn = await page.$('#removeAvatarBtn');
    if (!removeBtn) throw new Error('Remove button not found');
    const removeBtnDisplay = await removeBtn.evaluate(el => el.style.display);
    if (removeBtnDisplay !== 'none') throw new Error('Remove button should be hidden initially');
    console.log('✅ Remove button hidden initially');

    // Verify avatar hint text
    const avatarHint = await page.$('.avatar-hint');
    if (!avatarHint) throw new Error('Avatar hint not found');
    const hintText = await avatarHint.textContent();
    if (!hintText.includes('JPEG, PNG or WebP') || !hintText.includes('Max 5MB')) {
      throw new Error(`Wrong hint text: ${hintText}`);
    }
    console.log('✅ Avatar hint text correct');

    // Verify avatar section is at the top (before Personal Information)
    const firstName = await page.$('#first-name');
    const avatarSectionBox = await avatarSection.boundingBox();
    const firstNameBox = await firstName.boundingBox();
    if (!avatarSectionBox || !firstNameBox) {
      console.warn('⚠️  Could not verify positioning (elements may be off-screen)');
    } else if (avatarSectionBox.y >= firstNameBox.y) {
      throw new Error('Avatar section should be before Personal Information section');
    } else {
      console.log('✅ Avatar section positioned at top of modal');
    }

    // Verify CSS styling
    const avatarSectionStyles = await avatarSection.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        flexDirection: styles.flexDirection,
        alignItems: styles.alignItems,
        marginBottom: styles.marginBottom,
        paddingBottom: styles.paddingBottom
      };
    });
    if (avatarSectionStyles.display !== 'flex') throw new Error('Avatar section should use flexbox');
    if (avatarSectionStyles.flexDirection !== 'column') throw new Error('Avatar section should be column layout');
    if (avatarSectionStyles.alignItems !== 'center') throw new Error('Avatar section should center items');
    console.log('✅ Avatar section CSS styling correct');

    const avatarPreviewStyles = await avatarPreview.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        width: styles.width,
        height: styles.height,
        borderRadius: styles.borderRadius
      };
    });
    if (avatarPreviewStyles.width !== '100px' || avatarPreviewStyles.height !== '100px') {
      throw new Error('Avatar preview should be 100px × 100px');
    }
    if (avatarPreviewStyles.borderRadius !== '50%' && avatarPreviewStyles.borderRadius !== '50px') {
      throw new Error('Avatar preview should be circular (50% border-radius)');
    }
    console.log('✅ Avatar preview styling correct (100px circular)');

    // Check console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2378_ERROR.png' });
      process.exit(1);
    }

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2378_avatar_upload_ui.png' });
    console.log('✅ Screenshot saved');

    console.log('\n✅ All avatar upload UI components verified successfully');
    console.log(JSON.stringify({
      success: true,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      screenshot: '.playwright-mcp/task_2378_avatar_upload_ui.png',
      message: 'Avatar upload UI component implemented correctly'
    }, null, 2));

    await browser.close();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2378_ERROR.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
