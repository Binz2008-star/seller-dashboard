/**
 * Runtime API Client
 *
 * Handles communication with order-management-backend runtime services.
 * Provides type-safe interfaces for order operations, payments, and inventory.
 */

export interface RuntimeConfig {
  url: string
  authToken: string
}

export interface Order {
  id: string
  sellerId: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  total: number
  currency: string
  items: OrderItem[]
  createdAt: string
  updatedAt: string
  paymentId?: string
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  name: string
}

export interface OrderEvent {
  id: string
  orderId: string
  type: string
  data: any
  timestamp: string
}

export interface Payment {
  id: string
  orderId: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount: number
  currency: string
  method: string
  createdAt: string
}

export interface Inventory {
  productId: string
  available: number
  reserved: number
  total: number
  lastUpdated: string
}

export interface MarketData {
  productId: string
  currentPrice: number
  priceHistory: Array<{
    price: number
    date: string
  }>
  demand: 'low' | 'medium' | 'high'
}

export interface Seller {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  createdAt: string
}

export class RuntimeClient {
  private config: RuntimeConfig
  private baseUrl: string

  constructor(config: RuntimeConfig) {
    this.config = config
    this.baseUrl = config.url.replace(/\/$/, '') // Remove trailing slash
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.authToken}`,
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        throw new Error(`Runtime API error: ${response.status} ${response.statusText}`)
      }

      return (await response.json()) as T
    } catch (error) {
      console.error(`Runtime client error for ${endpoint}:`, error)
      throw error
    }
  }

  // Order operations
  async getOrdersBySeller(sellerId: string): Promise<{ orders: Order[]; total: number }> {
    return this.request(`/api/orders?sellerId=${sellerId}`)
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request(`/api/orders/${orderId}`)
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    return this.request(`/api/orders/${orderId}/events`)
  }

  // Payment operations
  async getPayment(paymentId: string): Promise<Payment> {
    return this.request(`/api/payments/${paymentId}`)
  }

  // Inventory operations
  async getInventory(productId: string): Promise<Inventory> {
    return this.request(`/api/inventory/${productId}`)
  }

  // Market data
  async getMarketData(productId: string): Promise<MarketData> {
    return this.request(`/api/market-data/${productId}`)
  }

  // Seller operations
  async getSeller(sellerId: string): Promise<Seller> {
    return this.request(`/api/sellers/${sellerId}`)
  }
}
