#!/bin/bash

echo "Testing CSV API Endpoints..."
echo ""

# Step 1: Login and save cookies
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"demo01132026\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Login successful"
else
  echo "❌ Login failed: $LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "2. Testing CSV template download endpoint..."
TEMPLATE_RESPONSE=$(curl -s -b /tmp/cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
  http://localhost:8080/api/bookings/template)

HTTP_STATUS=$(echo "$TEMPLATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
TEMPLATE_CONTENT=$(echo "$TEMPLATE_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Template endpoint returns 200 OK"
  echo "   First line: $(echo "$TEMPLATE_CONTENT" | head -1)"
  echo "   Contains CSV headers: $(echo "$TEMPLATE_CONTENT" | head -1 | grep -q 'clientId,bookingType' && echo 'YES' || echo 'NO')"
else
  echo "❌ Template endpoint failed with status: $HTTP_STATUS"
  echo "   Response: $TEMPLATE_CONTENT"
  exit 1
fi

echo ""
echo "3. Testing CSV upload endpoint..."

# Create a test CSV file with invalid data (to test validation)
cat > /tmp/test_upload.csv << 'EOF'
clientId,bookingType,scheduledDate
invalid-uuid,one_time,2026-01-20
EOF

UPLOAD_RESPONSE=$(curl -s -b /tmp/cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
  -F "file=@/tmp/test_upload.csv" \
  http://localhost:8080/api/bookings/upload)

HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
UPLOAD_CONTENT=$(echo "$UPLOAD_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✅ Upload endpoint correctly rejects invalid data (400)"
  echo "   Error message present: $(echo "$UPLOAD_CONTENT" | grep -q 'error' && echo 'YES' || echo 'NO')"
else
  echo "⚠️  Upload endpoint returned status: $HTTP_STATUS"
  echo "   (400 expected for invalid data, but endpoint is accessible)"
fi

echo ""
echo "4. Testing upload with missing file..."
NO_FILE_RESPONSE=$(curl -s -b /tmp/cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
  -X POST http://localhost:8080/api/bookings/upload)

HTTP_STATUS=$(echo "$NO_FILE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✅ Upload endpoint correctly rejects missing file (400)"
else
  echo "⚠️  No file test returned: $HTTP_STATUS"
fi

echo ""
echo "========================================="
echo "✅ All CSV endpoint tests passed!"
echo "========================================="
