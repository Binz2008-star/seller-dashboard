# UI Integration Pattern - BFF/Gateway Approach

## **Effective: 2026-04-08**

---

## **Problem Statement**

Direct UI-to-multiple-backends creates:

- Auth/session duplication
- Client orchestration complexity  
- Inconsistent error handling
- Multiple API contracts exposed to frontend

---

## **Solution: Backend-for-Frontend (BFF) Pattern**

```
seller-dashboard (UI)
        |
        | single API contract
        v
+---------------------+
| API Gateway / BFF   |
| (server-side facade) |
+----------+----------+
           |
    +------+------+
    |             |
    v             v
Runtime APIs   Platform APIs
(order-mgmt)    (sellora)
```

---

## **BFF Responsibilities**

### **1. Unified API Contract**
- Single GraphQL or REST API surface
- Consistent request/response format
- Unified error handling
- Single authentication point

### **2. Cross-Backend Orchestration**
- Combine data from multiple sources
- Server-side business logic coordination
- Transaction management across services
- Caching and optimization

### **3. Frontend Optimization**
- Mobile-friendly data shapes
- Reduced round trips
- Optimized payloads
- Progressive loading support

---

## **Implementation Options**

### **Option A: GraphQL BFF**
```typescript
// BFF Schema
type Query {
  sellerDashboard(sellerId: ID!): SellerDashboard!
  orderDetails(orderId: ID!): OrderDetails!
  productCatalog(filters: CatalogFilters): ProductCatalog!
}

type SellerDashboard {
  orders: [Order!]!
  metrics: DashboardMetrics!
  opportunities: [Opportunity!]!
  catalogStats: CatalogStats!
}
```

### **Option B: REST BFF**
```typescript
// BFF Endpoints
GET /api/dashboard/seller/{sellerId}
GET /api/orders/{orderId}/details
GET /api/catalog/products
POST /api/orders (orchestrates runtime + platform)
```

### **Option C: Hybrid Approach**
- GraphQL for complex queries
- REST for simple operations
- WebSocket for real-time updates

---

## **Data Flow Patterns**

### **1. Read Operations (Queries)**
```
UI Request
    |
    v
BFF
    |
    +-------+-------+
    |               |
    v               v
Runtime APIs   Platform APIs
    |               |
    +-------+-------+
    |
    v
BFF (combine/transform)
    |
    v
UI Response
```

### **2. Write Operations (Commands)**
```
UI Request
    |
    v
BFF (validate/orchestrate)
    |
    v
Runtime API (command)
    |
    v
BFF (handle response)
    |
    v
UI Response
```

### **3. Complex Operations**
```
UI Request
    |
    v
BFF
    |
    +-------+-------+-------+
    |       |       |       |
    v       v       v       v
Runtime  Platform External  Cache
APIs    APIs    APIs    Layer
    |       |       |       |
    +-------+-------+-------+
    |
    v
BFF (orchestrate)
    |
    v
UI Response
```

---

## **BFF Architecture**

### **Core Components**
```typescript
// BFF Service Structure
class BFFService {
  // Authentication
  authService: AuthService
  
  // Runtime Client
  runtimeClient: RuntimeApiClient
  
  // Platform Client  
  platformClient: PlatformApiClient
  
  // Caching Layer
  cacheService: CacheService
  
  // Orchestration
  orchestrationService: OrchestrationService
}
```

### **Request Flow**
```typescript
// Example: Get Seller Dashboard
async getSellerDashboard(sellerId: string) {
  // 1. Authenticate request
  const user = await this.authService.validateToken(token)
  
  // 2. Parallel data fetching
  const [orders, metrics, opportunities] = await Promise.all([
    this.runtimeClient.getOrders(sellerId),
    this.platformClient.getMetrics(sellerId),
    this.platformClient.getOpportunities(sellerId)
  ])
  
  // 3. Combine and transform
  return {
    orders: orders.map(this.transformOrder),
    metrics: this.calculateMetrics(metrics),
    opportunities: opportunities.map(this.transformOpportunity)
  }
}
```

---

## **Migration Strategy**

### **Phase 1: BFF Introduction**
1. Create BFF service alongside direct UI calls
2. Migrate read operations first (safer)
3. Keep direct calls as fallback

### **Phase 2: Write Operation Migration**
1. Move order creation through BFF
2. Move payment processing through BFF
3. Add orchestration logic

### **Phase 3: Complete Migration**
1. Remove all direct backend calls from UI
2. Optimize BFF performance
3. Add monitoring and observability

---

## **Benefits**

### **Frontend Benefits**
- Single API contract
- Consistent error handling
- Reduced complexity
- Better performance (server-side orchestration)

### **Backend Benefits**
- Protected internal APIs
- Better monitoring
- Easier evolution
- Security boundary

### **System Benefits**
- Clear separation of concerns
- Testable integration points
- Independent scaling
- Better observability

---

## **Implementation Considerations**

### **Performance**
- Implement strategic caching
- Use GraphQL DataLoader for N+1 prevention
- Optimize database queries
- Monitor response times

### **Security**
- Rate limiting at BFF level
- Request validation
- Audit logging
- Secure internal communication

### **Reliability**
- Circuit breakers for backend services
- Graceful degradation
- Retry logic
- Health checks

---

## **Success Metrics**

### **Frontend Metrics**
- [ ] Single API contract consumed
- [ ] Reduced client-side complexity
- [ ] Improved page load times
- [ ] Consistent error handling

### **Backend Metrics**
- [ ] Protected internal APIs
- [ ] Better monitoring visibility
- [ ] Reduced direct UI dependencies
- [ ] Improved security posture

### **System Metrics**
- [ ] Clear integration boundaries
- [ ] Independent scaling capability
- [ ] Better observability
- [ ] Easier testing

---

## **This pattern eliminates UI integration complexity while maintaining clean architecture boundaries.**
