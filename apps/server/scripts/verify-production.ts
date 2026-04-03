#!/usr/bin/env bun

/**
 * Seller Dashboard Production Verification v2
 *
 * Tests real system invariants, not just availability
 */

const PROD_URL = process.env.PROD_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
  data?: any
}

class SellerDashboardVerifier {
  private results: TestResult[] = []
  private testUserId?: string
  private testUserToken?: string
  private testOrderId?: string
  private baseUrl = PROD_URL

  private async testEndpoint(path: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    const start = Date.now()

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })

      this.results.push({
        name: `HTTP ${options?.method || 'GET'} ${path}`,
        status: response.ok ? 'PASS' : 'FAIL',
        message: `${response.status} ${response.statusText}`,
        duration: Date.now() - start
      })

      return response
    } catch (error) {
      this.results.push({
        name: `HTTP ${options?.method || 'GET'} ${path}`,
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      })

      throw error
    }
  }

  private async testHealthCheck(): Promise<TestResult> {
    console.log('🏥 Testing Health Check')
    const start = Date.now()


    try {
      const response = await this.testEndpoint('/')

      if (response.ok) {
        const text = await response.text()
        this.results.push({
          name: 'Health Check Response',
          status: 'PASS',
          message: `Response: ${text}`
        })
      }
    } catch (error) {
      this.results.push({
        name: 'Health Check',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testRealAuthFlow() {
    console.log('🔐 Testing Real Authentication Flow')

    const testUser = {
      email: `test-${Date.now()}@verification.com`,
      password: 'TestPassword123!',
      fullName: 'Verification Test User'
    }

    try {
      // Step 1: Sign up new user
      console.log('  📝 Creating test user...')
      const signupResponse = await this.testEndpoint('/api/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser)
      })

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json().catch(() => ({})) as { error?: string }
        this.results.push({
          name: 'Auth Sign-Up',
          status: 'FAIL',
          message: `Failed to create user: ${errorData.error || 'Unknown error'}`
        })
        return
      }

      const signupData = await signupResponse.json() as { user: { id: string }, token: string }
      this.testUserId = signupData.user.id
      this.testUserToken = signupData.token

      this.results.push({
        name: 'Auth Sign-Up',
        status: 'PASS',
        message: `User created successfully: ID ${this.testUserId}`
      })

      // Step 2: Sign in with same credentials
      console.log('  🔑 Testing sign-in...')
      const signinResponse = await this.testEndpoint('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      })

      if (!signinResponse.ok) {
        const errorData = await signinResponse.json().catch(() => ({})) as { error?: string }
        this.results.push({
          name: 'Auth Sign-In',
          status: 'FAIL',
          message: `Failed to sign in: ${errorData.error || 'Unknown error'}`
        })
        return
      }

      const signinData = await signinResponse.json() as { user: { id: string }, token: string }

      // Verify token consistency
      if (signinData.token !== this.testUserToken) {
        this.results.push({
          name: 'Auth Token Consistency',
          status: 'FAIL',
          message: 'Sign-in token differs from sign-up token'
        })
        return
      }

      this.results.push({
        name: 'Auth Sign-In',
        status: 'PASS',
        message: 'Sign-in successful, token consistent'
      })

    } catch (error) {
      this.results.push({
        name: 'Auth Flow',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testDatabaseWriteReadFlow() {
    console.log('� Testing Database Write-Read Flow')

    if (!this.testUserToken) {
      this.results.push({
        name: 'Database Write-Read',
        status: 'SKIP',
        message: 'No auth token available - skipping DB test'
      })
      return
    }

    try {
      // Step 1: Create a test order
      console.log('  📦 Creating test order...')
      const testOrder = {
        customerName: 'Test Customer',
        customerEmail: 'customer@test.com',
        items: [
          {
            name: 'Test Product',
            quantity: 1,
            price: 29.99
          }
        ],
        total: 29.99
      }

      const createResponse = await this.testEndpoint('/api/seller/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.testUserToken}`
        },
        body: JSON.stringify(testOrder)
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({})) as { error?: string }
        this.results.push({
          name: 'Database Write (Create Order)',
          status: 'FAIL',
          message: `Failed to create order: ${errorData.error || 'Unknown error'}`
        })
        return
      }

      const createdOrder = await createResponse.json() as { id: string, status: string }
      this.testOrderId = createdOrder.id

      this.results.push({
        name: 'Database Write (Create Order)',
        status: 'PASS',
        message: `Order created successfully: ID ${this.testOrderId}`
      })

      // Step 2: Read the order back
      console.log('  📖 Reading order back...')
      const readResponse = await this.testEndpoint(`/api/seller/orders/${this.testOrderId}`, {
        headers: {
          'Authorization': `Bearer ${this.testUserToken}`
        }
      })

      if (!readResponse.ok) {
        const errorData = await readResponse.json().catch(() => ({})) as { error?: string }
        this.results.push({
          name: 'Database Read (Get Order)',
          status: 'FAIL',
          message: `Failed to read order: ${errorData.error || 'Unknown error'}`
        })
        return
      }

      const readOrder = await readResponse.json() as { id: string, customerName: string, total: number }

      // Verify data integrity
      if (readOrder.id !== this.testOrderId) {
        this.results.push({
          name: 'Database Data Integrity',
          status: 'FAIL',
          message: 'Order ID mismatch between write and read'
        })
        return
      }

      if (readOrder.customerName !== testOrder.customerName) {
        this.results.push({
          name: 'Database Data Integrity',
          status: 'FAIL',
          message: 'Customer name mismatch between write and read'
        })
        return
      }

      if (Math.abs(readOrder.total - testOrder.total) > 0.01) {
        this.results.push({
          name: 'Database Data Integrity',
          status: 'FAIL',
          message: `Total mismatch: expected ${testOrder.total}, got ${readOrder.total}`
        })
        return
      }

      this.results.push({
        name: 'Database Read (Get Order)',
        status: 'PASS',
        message: `Order read successfully, data integrity verified`
      })

    } catch (error) {
      this.results.push({
        name: 'Database Write-Read Flow',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testAuthProtectedEndpoints() {
    console.log('�️ Testing Auth Protected Endpoints')

    try {
      // Test without token (should fail)
      const unauthorizedResponse = await this.testEndpoint('/api/seller/orders')

      if (unauthorizedResponse.status === 401) {
        this.results.push({
          name: 'Auth Protection (No Token)',
          status: 'PASS',
          message: 'Correctly rejects requests without token'
        })
      } else {
        this.results.push({
          name: 'Auth Protection (No Token)',
          status: 'FAIL',
          message: `Expected 401, got ${unauthorizedResponse.status}`
        })
      }

      // Test with invalid token (should fail)
      const invalidTokenResponse = await this.testEndpoint('/api/seller/orders', {
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        }
      })

      if (invalidTokenResponse.status === 401) {
        this.results.push({
          name: 'Auth Protection (Invalid Token)',
          status: 'PASS',
          message: 'Correctly rejects requests with invalid token'
        })
      } else {
        this.results.push({
          name: 'Auth Protection (Invalid Token)',
          status: 'FAIL',
          message: `Expected 401, got ${invalidTokenResponse.status}`
        })
      }

      // Test with valid token (should succeed)
      if (this.testUserToken) {
        const authorizedResponse = await this.testEndpoint('/api/seller/orders', {
          headers: {
            'Authorization': `Bearer ${this.testUserToken}`
          }
        })

        if (authorizedResponse.ok) {
          this.results.push({
            name: 'Auth Protection (Valid Token)',
            status: 'PASS',
            message: 'Correctly allows requests with valid token'
          })
        } else {
          this.results.push({
            name: 'Auth Protection (Valid Token)',
            status: 'FAIL',
            message: `Expected success, got ${authorizedResponse.status}`
          })
        }
      }

    } catch (error) {
      this.results.push({
        name: 'Auth Protection Tests',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testConcurrencySafety() {
    console.log('🔄 Testing Concurrency Safety')

    if (!this.testUserToken) {
      this.results.push({
        name: 'Concurrency Safety',
        status: 'SKIP',
        message: 'No auth token available - skipping concurrency test'
      })
      return
    }

    try {
      // Create multiple orders concurrently
      const orderPromises = Array.from({ length: 5 }, (_, i) =>
        this.testEndpoint('/api/seller/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.testUserToken}`
          },
          body: JSON.stringify({
            customerName: `Concurrent Test Customer ${i}`,
            customerEmail: `concurrent${i}@test.com`,
            items: [{ name: 'Test Product', quantity: 1, price: 10.00 }],
            total: 10.00
          })
        })
      )

      const responses = await Promise.all(orderPromises)

      // All should succeed
      const successCount = responses.filter(r => r.ok).length
      const expectedCount = 5

      if (successCount === expectedCount) {
        this.results.push({
          name: 'Concurrency Safety',
          status: 'PASS',
          message: `All ${expectedCount} concurrent requests succeeded`
        })
      } else {
        this.results.push({
          name: 'Concurrency Safety',
          status: 'FAIL',
          message: `Only ${successCount}/${expectedCount} concurrent requests succeeded`
        })
      }

    } catch (error) {
      this.results.push({
        name: 'Concurrency Safety',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async runFullVerification() {
    console.log(`🚀 Starting Seller Dashboard Production Verification v2 for ${PROD_URL}\n`)

    const startTime = Date.now()

    await this.testHealthCheck()
    console.log()

    await this.testRealAuthFlow()
    console.log()

    await this.testDatabaseWriteReadFlow()
    console.log()

    await this.testAuthProtectedEndpoints()
    console.log()

    await this.testConcurrencySafety()
    console.log()

    this.generateReport(Date.now() - startTime)
  }

  private generateReport(totalDuration: number) {
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const skipped = this.results.filter(r => r.status === 'SKIP').length

    console.log('📊 SELLER DASHBOARD PRODUCTION VERIFICATION REPORT v2')
    console.log('='.repeat(70))
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏭️ Skipped: ${skipped}`)
    console.log(`⏱️ Duration: ${totalDuration}ms`)
    console.log()

    console.log('DETAILED RESULTS:')
    console.log('-'.repeat(70))

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'
      const duration = result.duration ? ` (${result.duration}ms)` : ''
      console.log(`${icon} ${result.name}${duration}`)
      console.log(`   ${result.message}`)
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`)
      }
      console.log()
    })

    // Critical assessment - now much stricter
    const criticalFailures = this.results.filter(r =>
      r.status === 'FAIL' && (
        r.name.includes('Auth') ||
        r.name.includes('Database') ||
        r.name.includes('Concurrency')
      )
    )

    const dataIntegrityFailures = this.results.filter(r =>
      r.status === 'FAIL' && r.name.includes('Data Integrity')
    )

    if (criticalFailures.length > 0 || dataIntegrityFailures.length > 0) {
      console.log('🚨 CRITICAL ISSUES FOUND:')
      console.log('The system is NOT production-safe!')

      const allFailures = criticalFailures.concat(dataIntegrityFailures)
      allFailures.forEach(failure => {
        console.log(`❌ ${failure.name}: ${failure.message}`)
      })

      console.log()
      console.log('🎯 REQUIRED ACTIONS:')
      console.log('1. Fix authentication system failures')
      console.log('2. Resolve database write-read issues')
      console.log('3. Ensure data integrity consistency')
      console.log('4. Address concurrency safety problems')
      console.log('5. Run this verification script again')
      console.log('6. Only proceed with frontend development after ALL critical tests pass')
    } else if (failed > 0) {
      console.log('⚠️ NON-CRITICAL ISSUES FOUND:')
      console.log('System is functional but needs optimization')
    } else {
      console.log('🎉 PRODUCTION READY!')
      console.log('All critical systems are functioning correctly with data integrity verified')
      console.log('Real system invariants are working - you can proceed with frontend development')
    }

    // Cleanup test data if we have a token
    if (this.testUserToken && this.testOrderId) {
      console.log()
      console.log('🧹 Note: Test data was created during verification.')
      console.log(`   Test User ID: ${this.testUserId}`)
      console.log(`   Test Order ID: ${this.testOrderId}`)
      console.log('   Consider adding cleanup endpoints for production testing.')
    }
  }
}

// Run verification if called directly
if (import.meta.path === process.argv[1] || process.argv[1].endsWith('verify-production.ts')) {
  const verifier = new SellerDashboardVerifier()
  verifier.runFullVerification().catch(console.error)
}

export { SellerDashboardVerifier }
