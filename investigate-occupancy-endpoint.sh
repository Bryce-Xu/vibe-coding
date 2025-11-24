#!/bin/bash

# 详细调查 occupancy 端点的脚本

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJXTmFZVG1xNDlXUEdVQzBEYlVLcEpGRkNoY09mMk9pUzY5c0hfeTBOMW9FIiwiaWF0IjoxNzYzOTYyMDEyfQ.LdAIkdBLyjwTEECvBsEQ2VMgHcbc54BzDoymVUftAHY"
BASE_URL="https://api.transport.nsw.gov.au"

echo "🔍 Investigating Transport NSW Carpark Occupancy Endpoint"
echo "=========================================================="
echo ""

# Test 1: Check if endpoint exists with HEAD request
echo "Test 1: HEAD request to check endpoint existence"
echo "--------------------------------------------------"
curl -I -s "$BASE_URL/v1/carpark/occupancy" \
  -H "Authorization: apikey $API_KEY" \
  -H "Accept: application/json" | head -10
echo ""

# Test 2: Try with different HTTP methods
echo "Test 2: Testing different HTTP methods"
echo "--------------------------------------------------"
for method in GET POST OPTIONS; do
  echo -n "$method: "
  curl -X $method -s "$BASE_URL/v1/carpark/occupancy" \
    -H "Authorization: apikey $API_KEY" \
    -H "Accept: application/json" 2>&1 | head -1
done
echo ""

# Test 3: Check response headers for rate limit info
echo "Test 3: Response headers analysis"
echo "--------------------------------------------------"
curl -v -s "$BASE_URL/v1/carpark/occupancy" \
  -H "Authorization: apikey $API_KEY" \
  -H "Accept: application/json" 2>&1 | grep -E "(HTTP|X-RateLimit|X-Quota|Retry-After|429)" | head -10
echo ""

# Test 4: Compare with working endpoint headers
echo "Test 4: Comparing headers with working /v1/carpark endpoint"
echo "--------------------------------------------------"
echo "Working endpoint (/v1/carpark):"
curl -I -s "$BASE_URL/v1/carpark" \
  -H "Authorization: apikey $API_KEY" \
  -H "Accept: application/json" | grep -E "(HTTP|X-)" | head -5
echo ""
echo "Occupancy endpoint (/v1/carpark/occupancy):"
curl -I -s "$BASE_URL/v1/carpark/occupancy" \
  -H "Authorization: apikey $API_KEY" \
  -H "Accept: application/json" | grep -E "(HTTP|X-)" | head -5
echo ""

# Test 5: Check if there's a different endpoint structure
echo "Test 5: Testing alternative endpoint structures"
echo "--------------------------------------------------"
for path in "/v1/carpark/occupancy" "/v1/carpark/occupancy/" "/v1/carpark/occupancy/all" "/v1/carpark/occupancy/list"; do
  echo -n "$path: "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" \
    -H "Authorization: apikey $API_KEY" \
    -H "Accept: application/json")
  echo "HTTP $status"
done
echo ""

echo "=========================================================="
echo "Investigation complete. Check results above."

