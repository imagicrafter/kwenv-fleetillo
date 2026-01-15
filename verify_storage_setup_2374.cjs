const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Supabase Storage Bucket Setup Script Verification ===\n');

  // Test 1: Check file exists
  console.log('Test 1: Checking file existence...');
  const filePath = path.join(__dirname, 'supabase/setup-avatar-storage.sql');

  if (!fs.existsSync(filePath)) {
    console.error('❌ File supabase/setup-avatar-storage.sql does not exist');
    process.exit(1);
  }
  console.log('✅ File exists at supabase/setup-avatar-storage.sql');

  // Test 2: Read and parse file content
  console.log('\nTest 2: Reading file content...');
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.length === 0) {
    console.error('❌ File is empty');
    process.exit(1);
  }
  console.log(`✅ File contains ${content.length} characters`);

  // Test 3: Verify documentation comments
  console.log('\nTest 3: Checking documentation comments...');
  const hasRunInstructions = content.includes('Run this in Supabase SQL Editor');
  const hasPurposeComment = content.includes('storing driver profile images') ||
                            content.includes('driver avatars');
  const hasDashboardAlternative = content.includes('Supabase Dashboard') &&
                                  content.includes('Storage') &&
                                  content.includes('New Bucket');

  if (hasRunInstructions && hasPurposeComment && hasDashboardAlternative) {
    console.log('✅ Documentation includes run instructions and Dashboard alternative');
  } else {
    console.error('❌ Missing required documentation comments');
    if (!hasRunInstructions) console.error('  - Missing SQL Editor run instructions');
    if (!hasPurposeComment) console.error('  - Missing purpose comment');
    if (!hasDashboardAlternative) console.error('  - Missing Dashboard UI alternative');
    process.exit(1);
  }

  // Test 4: Verify bucket creation SQL
  console.log('\nTest 4: Checking bucket creation SQL...');
  const hasBucketInsert = content.includes('INSERT INTO storage.buckets');
  const hasBucketId = content.includes("'avatars'") && content.includes('avatars');
  const hasPublicFlag = content.includes('public') && content.includes('true');
  const hasConflictHandling = content.includes('ON CONFLICT (id) DO NOTHING');

  if (hasBucketInsert && hasBucketId && hasPublicFlag && hasConflictHandling) {
    console.log('✅ Bucket creation SQL is correct');
  } else {
    console.error('❌ Bucket creation SQL is missing or incorrect');
    if (!hasBucketInsert) console.error('  - Missing INSERT INTO storage.buckets');
    if (!hasBucketId) console.error('  - Missing avatars bucket ID');
    if (!hasPublicFlag) console.error('  - Missing public flag');
    if (!hasConflictHandling) console.error('  - Missing conflict handling');
    process.exit(1);
  }

  // Test 5: Verify RLS policy for authenticated uploads
  console.log('\nTest 5: Checking RLS policy for authenticated uploads...');
  const hasUploadPolicy = content.includes('CREATE POLICY') &&
                          content.includes('authenticated uploads');
  const hasUploadInsert = content.includes('FOR INSERT TO authenticated');
  const hasUploadCheck = content.includes('WITH CHECK') &&
                         content.includes("bucket_id = 'avatars'");

  if (hasUploadPolicy && hasUploadInsert && hasUploadCheck) {
    console.log('✅ Authenticated upload policy is correct');
  } else {
    console.error('❌ Authenticated upload policy is missing or incorrect');
    process.exit(1);
  }

  // Test 6: Verify RLS policy for public read access
  console.log('\nTest 6: Checking RLS policy for public read access...');
  const hasReadPolicy = content.includes('CREATE POLICY') &&
                        content.includes('public read');
  const hasReadSelect = content.includes('FOR SELECT TO public');
  const hasReadUsing = content.includes('USING') &&
                       content.includes("bucket_id = 'avatars'");

  if (hasReadPolicy && hasReadSelect && hasReadUsing) {
    console.log('✅ Public read policy is correct');
  } else {
    console.error('❌ Public read policy is missing or incorrect');
    process.exit(1);
  }

  // Test 7: Verify RLS policy for authenticated deletes
  console.log('\nTest 7: Checking RLS policy for authenticated deletes...');
  const hasDeletePolicy = content.includes('CREATE POLICY') &&
                          content.includes('authenticated deletes');
  const hasDeleteDelete = content.includes('FOR DELETE TO authenticated');
  const hasDeleteUsing = content.includes('USING') &&
                         content.includes("bucket_id = 'avatars'");

  if (hasDeletePolicy && hasDeleteDelete && hasDeleteUsing) {
    console.log('✅ Authenticated delete policy is correct');
  } else {
    console.error('❌ Authenticated delete policy is missing or incorrect');
    process.exit(1);
  }

  // Test 8: Count all required policies
  console.log('\nTest 8: Verifying all three policies are present...');
  const policyCount = (content.match(/CREATE POLICY/g) || []).length;

  if (policyCount >= 3) {
    console.log(`✅ Found ${policyCount} CREATE POLICY statements (expected at least 3)`);
  } else {
    console.error(`❌ Only found ${policyCount} CREATE POLICY statements (expected 3)`);
    process.exit(1);
  }

  // Test 9: Verify SQL syntax (basic check)
  console.log('\nTest 9: Basic SQL syntax validation...');
  const hasValidSyntax = !content.includes('INSER INTO') && // common typo
                         !content.includes('CREAT POLICY') && // common typo
                         content.includes(';'); // has statement terminators

  if (hasValidSyntax) {
    console.log('✅ Basic SQL syntax appears valid');
  } else {
    console.error('❌ SQL syntax issues detected');
    process.exit(1);
  }

  console.log('\n=== All Supabase Storage Setup Script Tests Passed ✅ ===');
  console.log('\nSummary:');
  console.log('- File exists: ✅');
  console.log('- Documentation complete: ✅ (SQL Editor + Dashboard alternative)');
  console.log('- Bucket creation: ✅ (avatars, public, with conflict handling)');
  console.log('- Upload policy: ✅ (authenticated users can upload)');
  console.log('- Read policy: ✅ (public can read)');
  console.log('- Delete policy: ✅ (authenticated users can delete)');
  console.log('- SQL syntax: ✅');
})();
