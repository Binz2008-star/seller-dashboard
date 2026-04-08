/**
 * Backend for Frontend (BFF)
 * 
 * Provides unified API surface for seller-dashboard UI.
 * Orchestrates calls to runtime and platform APIs.
 */

import express from 'express'
import cors from 'cors'
import { RuntimeClient } from '../integration/runtime-client'
import { PlatformClient } from '../integration/platform-client'

export interface BFFConfig {
  port: number
  runtime: {
    url: string
    authToken: string
  }
  platform: {
    url: string
    authToken: string
  }
}

export class BFFServer {
  private app: express.Application
  private runtimeClient: RuntimeClient
  private platformClient: PlatformClient
  private config: BFFConfig

  constructor(config: BFFConfig) {
    this.config = config
    this.app = express()
    this.runtimeClient = new RuntimeClient(config.runtime)
    this.platformClient = new PlatformClient(config.platform)
    
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(cors())
    this.app.use(express.json())
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`)
      next()
    })
    
    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('BFF Error:', err)
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      })
    })
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() })
    })

    // Seller Dashboard - unified endpoint
    this.app.get('/api/dashboard/seller/:sellerId', async (req, res, next) => {
      try {
        const { sellerId } = req.params
        
        // Parallel data fetching from both backends
        const [orders, metrics, opportunities, catalogStats] = await Promise.all([
          this.runtimeClient.getOrdersBySeller(sellerId),
          this.platformClient.getSellerMetrics(sellerId),
          this.platformClient.getOpportunities({ sellerId }),
          this.platformClient.getCatalogStats(sellerId)
        ])

        // Combine and transform for frontend
        const dashboard = {
          seller: await this.runtimeClient.getSeller(sellerId),
          orders: orders.orders,
          orderStats: {
            total: orders.total,
            pending: orders.orders.filter(o => o.status === 'pending').length,
            completed: orders.orders.filter(o => o.status === 'completed').length
          },
          metrics,
          opportunities: opportunities.opportunities,
          catalogStats
        }

        res.json(dashboard)
      } catch (error) {
        next(error)
      }
    })

    // Order details with enriched data
    this.app.get('/api/orders/:orderId/details', async (req, res, next) => {
      try {
        const { orderId } = req.params
        
        // Get order from runtime
        const order = await this.runtimeClient.getOrder(orderId)
        
        // Get order events from runtime
        const events = await this.runtimeClient.getOrderEvents(orderId)
        
        // Get payment info from runtime
        const payment = await this.runtimeClient.getPayment(order.paymentId || '')
        
        // Get related catalog info from platform
        const catalogItems = await this.platformClient.getCatalogItemsForOrder(orderId)

        const orderDetails = {
          ...order,
          events,
          payment,
          catalogItems
        }

        res.json(orderDetails)
      } catch (error) {
        next(error)
      }
    })

    // Product catalog with availability
    this.app.get('/api/catalog/products', async (req, res, next) => {
      try {
        const { sellerId, category, search } = req.query
        
        // Get catalog from platform
        const catalog = await this.platformClient.getProducts({
          sellerId: sellerId as string,
          category: category as string,
          search: search as string
        })

        // Enrich with runtime availability data
        const enrichedProducts = await Promise.all(
          catalog.products.map(async (product: any) => {
            const inventory = await this.runtimeClient.getInventory(product.id)
            return {
              ...product,
              availability: inventory
            }
          })
        )

        res.json({
          ...catalog,
          products: enrichedProducts
        })
      } catch (error) {
        next(error)
      }
    })

    // Create order (orchestrates runtime + platform)
    this.app.post('/api/orders', async (req, res, next) => {
      try {
        const orderData = req.body
        
        // Validate product availability via runtime
        for (const item of orderData.items) {
          const inventory = await this.runtimeClient.getInventory(item.productId)
          if (inventory.available < item.quantity) {
            return res.status(400).json({
              error: 'Insufficient inventory',
              productId: item.productId,
              available: inventory.available,
              requested: item.quantity
            })
          }
        }

        // Create order via runtime
        const order = await this.runtimeClient.createOrder(orderData)
        
        // Update platform catalog stats
        await this.platformClient.updateCatalogStats(orderData.sellerId)

        res.status(201).json(order)
      } catch (error) {
        next(error)
      }
    })

    // Opportunities with market data
    this.app.get('/api/opportunities', async (req, res, next) => {
      try {
        const { sellerId, category, minProfit } = req.query
        
        // Get opportunities from platform
        const opportunities = await this.platformClient.getOpportunities({
          sellerId: sellerId as string,
          category: category as string,
          minProfit: minProfit ? parseFloat(minProfit as string) : undefined
        })

        // Enrich with runtime market data
        const enrichedOpportunities = await Promise.all(
          opportunities.opportunities.map(async (opp: any) => {
            const marketData = await this.runtimeClient.getMarketData(opp.productId)
            return {
              ...opp,
              marketData
            }
          })
        )

        res.json({
          ...opportunities,
          opportunities: enrichedOpportunities
        })
      } catch (error) {
        next(error)
      }
    })

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
      })
    })
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        console.log(`BFF Server running on port ${this.config.port}`)
        resolve()
      })
    })
  }
}

// Platform client stub (to be implemented)
class PlatformClient {
  constructor(config: any) {}

  async getSellerMetrics(sellerId: string) {
    return { revenue: 0, orders: 0, products: 0 }
  }

  async getOpportunities(options: any) {
    return { opportunities: [], total: 0 }
  }

  async getCatalogStats(sellerId: string) {
    return { products: 0, categories: 0 }
  }

  async getProducts(options: any) {
    return { products: [], total: 0 }
  }

  async getCatalogItemsForOrder(orderId: string) {
    return []
  }

  async updateCatalogStats(sellerId: string) {
    return
  }

  async getMarketData(productId: string) {
    return {}
  }
}
