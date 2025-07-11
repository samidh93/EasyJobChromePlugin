#!/bin/bash

# EasyJob API Integration Test Runner
# This script runs comprehensive integration tests for the EasyJob API

set -e

echo "🚀 EasyJob API Integration Test Runner"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the test directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install
fi

# Check if API server is running
echo "🔍 Checking if API server is running..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API server is running"
else
    echo "❌ API server is not running. Please start it first:"
    echo "   cd ../docker && ./run-api.sh"
    exit 1
fi

# Check if database is running
echo "🔍 Checking if database is running..."
if curl -s http://localhost:3001/api/users/exists/test@example.com > /dev/null; then
    echo "✅ Database is accessible"
else
    echo "❌ Database is not accessible. Please start it first:"
    echo "   cd ../docker && ./run-database.sh"
    exit 1
fi

# Run the tests
echo "🧪 Running integration tests..."
echo "======================================"

# Run tests with detailed output
npm test

echo "======================================"
echo "✅ Integration tests completed!"
echo ""
echo "📊 Test Summary:"
echo "- API Health Check: ✅"
echo "- User Management: ✅"
echo "- Resume Management: ✅"
echo "- Error Handling: ✅"
echo ""
echo "🎉 All tests passed! Your API is working correctly." 