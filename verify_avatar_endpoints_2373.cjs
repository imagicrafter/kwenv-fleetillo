const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Avatar Upload API Endpoint Verification ===\n');

  // Test 1: Verify server.js contains imageUpload configuration
  console.log('Test 1: Checking imageUpload multer configuration...');
  const serverPath = path.join(__dirname, 'web-launcher/server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');

  const hasImageUpload = serverContent.includes('const imageUpload = multer');
  const hasFileFilter = serverContent.includes('allowedMimes = [\'image/jpeg\', \'image/jpg\', \'image/png\', \'image/webp\']');
  const hasFileSizeLimit = serverContent.includes('fileSize: 5 * 1024 * 1024');

  if (hasImageUpload && hasFileFilter && hasFileSizeLimit) {
    console.log('✅ imageUpload multer configuration found with correct settings');
  } else {
    console.error('❌ imageUpload configuration missing or incorrect');
    process.exit(1);
  }

  // Test 2: Verify POST /api/drivers/:id/avatar endpoint exists
  console.log('\nTest 2: Checking POST /api/drivers/:id/avatar endpoint...');
  const hasPostEndpoint = serverContent.includes('app.post(\'/api/drivers/:id/avatar\'');
  const usesImageUploadMiddleware = serverContent.includes('imageUpload.single(\'avatar\')');
  const callsUploadDriverAvatar = serverContent.includes('driverService.uploadDriverAvatar');

  if (hasPostEndpoint && usesImageUploadMiddleware && callsUploadDriverAvatar) {
    console.log('✅ POST endpoint exists with imageUpload middleware and service call');
  } else {
    console.error('❌ POST endpoint missing or incomplete');
    process.exit(1);
  }

  // Test 3: Verify DELETE /api/drivers/:id/avatar endpoint exists
  console.log('\nTest 3: Checking DELETE /api/drivers/:id/avatar endpoint...');
  const hasDeleteEndpoint = serverContent.includes('app.delete(\'/api/drivers/:id/avatar\'');
  const callsDeleteDriverAvatar = serverContent.includes('driverService.deleteDriverAvatar');

  if (hasDeleteEndpoint && callsDeleteDriverAvatar) {
    console.log('✅ DELETE endpoint exists with service call');
  } else {
    console.error('❌ DELETE endpoint missing or incomplete');
    process.exit(1);
  }

  // Test 4: Verify endpoints are placed before RPC handler
  console.log('\nTest 4: Checking endpoint placement...');
  const avatarUploadIndex = serverContent.indexOf('app.post(\'/api/drivers/:id/avatar\'');
  const rpcHandlerIndex = serverContent.indexOf('app.post(\'/api/rpc\'');

  if (avatarUploadIndex > 0 && rpcHandlerIndex > avatarUploadIndex) {
    console.log('✅ Avatar endpoints are placed before RPC handler');
  } else {
    console.error('❌ Avatar endpoints are not placed correctly');
    process.exit(1);
  }

  // Test 5: Verify error handling in POST endpoint
  console.log('\nTest 5: Checking error handling...');
  const hasNoFileCheck = serverContent.includes('if (!req.file)') &&
                         serverContent.includes('No file uploaded');
  const hasSuccessCheck = serverContent.includes('if (!result.success)');
  const hasTryCatch = serverContent.match(/app\.post\('\/api\/drivers\/:id\/avatar'.*?try\s*{/s);

  if (hasNoFileCheck && hasSuccessCheck && hasTryCatch) {
    console.log('✅ Proper error handling implemented');
  } else {
    console.error('❌ Error handling incomplete');
    process.exit(1);
  }

  // Test 6: Test server is running and responsive
  console.log('\nTest 6: Testing server availability...');
  try {
    const response = await fetch('http://localhost:8080/health');
    if (response.status === 200 || response.status === 302) {
      console.log('✅ Server is running and responsive');
    } else {
      console.error('❌ Server returned unexpected status:', response.status);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Server not accessible:', error.message);
    process.exit(1);
  }

  console.log('\n=== All Avatar Upload API Endpoint Tests Passed ✅ ===');
  console.log('\nSummary:');
  console.log('- imageUpload multer configuration: ✅ Present with 5MB limit, image MIME types');
  console.log('- POST /api/drivers/:id/avatar: ✅ Implemented with middleware');
  console.log('- DELETE /api/drivers/:id/avatar: ✅ Implemented');
  console.log('- Endpoint placement: ✅ Before RPC handler');
  console.log('- Error handling: ✅ Complete');
  console.log('- Server status: ✅ Running');
})();
