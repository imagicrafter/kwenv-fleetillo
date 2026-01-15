const fs = require('fs');
const path = require('path');

console.log('=== Task 2371: Verify Multer Image Upload Middleware ===\n');

const filePath = path.join(__dirname, 'src/middleware/imageUpload.ts');

// Check 1: File exists
if (!fs.existsSync(filePath)) {
  console.log('❌ FAIL: src/middleware/imageUpload.ts does not exist');
  process.exit(1);
}
console.log('✅ File exists: src/middleware/imageUpload.ts');

// Read the file content
const content = fs.readFileSync(filePath, 'utf-8');

// Check 2: Uses memoryStorage
if (content.includes('multer.memoryStorage()')) {
  console.log('✅ Uses multer.memoryStorage() for buffer handling');
} else {
  console.log('❌ FAIL: memoryStorage not configured');
  process.exit(1);
}

// Check 3: File size limit is 5MB
if (content.includes('5 * 1024 * 1024')) {
  console.log('✅ File size limit set to 5MB');
} else {
  console.log('❌ FAIL: File size limit not set to 5MB');
  process.exit(1);
}

// Check 4: Allowed mime types
const requiredMimes = ['image/jpeg', 'image/png', 'image/webp'];
let allMimesPresent = true;
for (const mime of requiredMimes) {
  if (!content.includes(mime)) {
    console.log(`❌ FAIL: Missing mime type: ${mime}`);
    allMimesPresent = false;
  }
}
if (allMimesPresent) {
  console.log('✅ All required mime types present: JPEG, PNG, WebP');
} else {
  process.exit(1);
}

// Check 5: avatarUpload middleware is exported
if (content.includes('export const avatarUpload')) {
  console.log('✅ avatarUpload middleware is exported');
} else {
  console.log('❌ FAIL: avatarUpload not exported');
  process.exit(1);
}

// Check 6: Uses single file upload with 'avatar' field
if (content.includes(".single('avatar')")) {
  console.log('✅ Configured for single file upload with field name "avatar"');
} else {
  console.log('❌ FAIL: Not configured for single file upload with avatar field');
  process.exit(1);
}

// Check 7: Has error handling
if (content.includes('handleImageUploadError')) {
  console.log('✅ Error handling function included');
} else {
  console.log('⚠️  Warning: No error handling function found');
}

// Check 8: Has requireImage validation
if (content.includes('requireImage')) {
  console.log('✅ File validation middleware included');
} else {
  console.log('⚠️  Warning: No file validation middleware found');
}

console.log('\n=== All Tests Passed ===');
console.log('Multer image upload middleware is correctly configured:');
console.log('  - Storage: Memory (for Supabase uploads)');
console.log('  - Size limit: 5MB');
console.log('  - Allowed types: JPEG, PNG, WebP');
console.log('  - Export: avatarUpload middleware ready for use');
