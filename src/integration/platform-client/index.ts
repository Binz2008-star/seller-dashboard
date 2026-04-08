/**
 * Platform API Client
 *
 * Handles communication with sellora platform services.
 * Provides interfaces for catalog management, opportunities, and analytics.
 */

export interface PlatformConfig {
  url: string
  authToken: string
}

export interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  currency: string
  images: string[]
  attributes: Record<string, any>
  sellerId: string
  status: 'active' | 'inactive' | 'draft'
  createdAt: string
  updatedAt: string
}

export interface Opportunity {
  id: string
  productId: string
  title: string
  description: string
  estimatedProfit: number
  confidence: number
  category: string
  marketTrend: 'rising' | 'stable' | 'declining'
  competitionLevel: 'low' | 'medium' | 'high'
  requirements: string[]
  createdAt: string
}

export interface SellerMetrics {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  orders: {
    total: number
    thisMonth: number
    completed: number
    cancelled: number
  }
  products: {
    total: number
    active: number
    categories: number
  }
  performance: {
    averageRating: number
    responseTime: number
    fulfillmentRate: number
  }
}

export interface CatalogStats {
  totalProducts: number
  activeProducts: number
  categories: Array<{
    name: string
    count: number
    revenue: number
  }>
  topPerformers: Array<{
    productId: string
    name: string
    revenue: number
    orders: number
  }>
}

export class PlatformClient {
  private config: PlatformConfig
  private baseUrl: string

  constructor(config: PlatformConfig) {
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
        throw new Error(`Platform API error: ${response.status} ${response.statusText}`)
      }

      return (await response.json()) as T
    } catch (error) {
      console.error(`Platform client error for ${endpoint}:`, error)
      throw error
    }
  }

  // Seller metrics and analytics
  async getSellerMetrics(sellerId: string): Promise<SellerMetrics> {
    return this.request(`/api/sellers/${sellerId}/metrics`)
  }

  // Opportunities
  async getOpportunities(options: {
    sellerId?: string
    category?: string
    minProfit?: number
    limit?: number
  }): Promise<{ opportunities: Opportunity[]; total: number }> {
    const params = new URLSearchParams()

    if (options.sellerId) params.append('sellerId', options.sellerId)
    if (options.category) params.append('category', options.category)
    if (options.minProfit) params.append('minProfit', options.minProfit.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    return this.request(`/api/opportunities?${params.toString()}`)
  }

  // Catalog operations
  async getCatalogStats(sellerId: string): Promise<CatalogStats> {
    return this.request(`/api/sellers/${sellerId}/catalog/stats`)
  }

  async getProducts(options: {
    sellerId?: string
    category?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ products: Product[]; total: number }> {
    const params = new URLSearchParams()

    if (options.sellerId) params.append('sellerId', options.sellerId)
    if (options.category) params.append('category', options.category)
    if (options.search) params.append('search', options.search)
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.offset) params.append('offset', options.offset.toString())

    return this.request(`/api/products?${params.toString()}`)
  }

  async getCatalogItemsForOrder(orderId: string): Promise<Product[]> {
    return this.request(`/api/orders/${orderId}/catalog-items`)
  }

  async updateCatalogStats(sellerId: string): Promise<void> {
    return this.request(`/api/sellers/${sellerId}/catalog/stats/update`, {
      method: 'POST',
    })
  }

  // Market data
  async getMarketData(productId: string): Promise<{
    currentPrice: number
    priceHistory: Array<{ price: number; date: string }>
    demand: 'low' | 'medium' | 'high'
    competition: 'low' | 'medium' | 'high'
    trend: 'rising' | 'stable' | 'declining'
  }> {
    return this.request(`/api/products/${productId}/market-data`)
  }
}
