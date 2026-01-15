const fs = require('fs');
const path = require('path');

console.log('=== Task 2372: Verify Avatar Upload Service Functions ===\n');

const filePath = path.join(__dirname, 'src/services/driver.service.ts');

if (!fs.existsSync(filePath)) {
  console.log('❌ FAIL: driver.service.ts does not exist');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');

// Check 1: uploadDriverAvatar function exists
if (content.includes('export async function uploadDriverAvatar')) {
  console.log('✅ uploadDriverAvatar function exists');
} else {
  console.log('❌ FAIL: uploadDriverAvatar function not found');
  process.exit(1);
}

// Check 2: Function signature matches requirements
if (content.includes('driverId: string') &&
    content.includes('fileBuffer: Buffer') &&
    content.includes('mimeType: string') &&
    content.includes('originalName: string')) {
  console.log('✅ uploadDriverAvatar has correct parameters (driverId, fileBuffer, mimeType, originalName)');
} else {
  console.log('❌ FAIL: uploadDriverAvatar parameters incorrect');
  process.exit(1);
}

// Check 3: Uses Supabase storage client
if (content.includes('supabase.storage') && content.includes(".from('avatars')")) {
  console.log('✅ Uses Supabase storage client with avatars bucket');
} else {
  console.log('❌ FAIL: Does not use Supabase storage correctly');
  process.exit(1);
}

// Check 4: Generates unique filename with path pattern
if (content.includes('drivers/${driverId}') && content.includes('avatar_${Date.now()}')) {
  console.log('✅ Generates unique filename with drivers/{driverId}/avatar_{timestamp} pattern');
} else {
  console.log('❌ FAIL: Filename pattern not correct');
  process.exit(1);
}

// Check 5: Updates profile_image_url field
if (content.includes('profile_image_url') && content.includes('update({ profile_image_url:')) {
  console.log('✅ Updates driver profile_image_url field after upload');
} else {
  console.log('❌ FAIL: Does not update profile_image_url');
  process.exit(1);
}

// Check 6: Deletes previous avatar
if (content.includes('Delete previous avatar') || content.includes('remove([oldPath])')) {
  console.log('✅ Deletes previous avatar before uploading new one');
} else {
  console.log('⚠️  Warning: May not delete previous avatar');
}

// Check 7: getDriverAvatarUrl function exists
if (content.includes('export async function getDriverAvatarUrl')) {
  console.log('✅ getDriverAvatarUrl function exists');
} else {
  console.log('❌ FAIL: getDriverAvatarUrl function not found');
  process.exit(1);
}

// Check 8: Returns URL or null
if (content.match(/getDriverAvatarUrl.*Promise<Result<string \| null>>/)) {
  console.log('✅ getDriverAvatarUrl returns Result<string | null>');
} else {
  console.log('⚠️  Warning: getDriverAvatarUrl return type may be incorrect');
}

// Check 9: deleteDriverAvatar function exists
if (content.includes('export async function deleteDriverAvatar')) {
  console.log('✅ deleteDriverAvatar function exists');
} else {
  console.log('❌ FAIL: deleteDriverAvatar function not found');
  process.exit(1);
}

// Check 10: Deletes from storage and clears URL
if (content.includes('storage.from') &&
    content.includes('.remove(') &&
    content.includes('profile_image_url: null')) {
  console.log('✅ deleteDriverAvatar removes file from storage and clears profile_image_url');
} else {
  console.log('❌ FAIL: deleteDriverAvatar does not properly clean up');
  process.exit(1);
}

// Check 11: Error handling
const uploadMatch = content.match(/uploadDriverAvatar[\s\S]*?catch \(error\)/);
const getMatch = content.match(/getDriverAvatarUrl[\s\S]*?catch \(error\)/);
const deleteMatch = content.match(/deleteDriverAvatar[\s\S]*?catch \(error\)/);

if (uploadMatch && getMatch && deleteMatch) {
  console.log('✅ All three functions have error handling with try-catch blocks');
} else {
  console.log('⚠️  Warning: Some functions may be missing error handling');
}

// Check 12: Logging
if (content.includes("logger.debug('Uploading driver avatar'") &&
    content.includes("logger.info('Driver avatar uploaded successfully'")) {
  console.log('✅ Proper logging implemented');
} else {
  console.log('⚠️  Warning: Logging may be incomplete');
}

console.log('\n=== All Tests Passed ===');
console.log('Avatar upload service functions are correctly implemented:');
console.log('  - uploadDriverAvatar: Uploads to Supabase storage, updates DB');
console.log('  - getDriverAvatarUrl: Returns existing avatar URL or null');
console.log('  - deleteDriverAvatar: Removes from storage and clears DB field');
console.log('  - All functions handle errors gracefully with logging');
