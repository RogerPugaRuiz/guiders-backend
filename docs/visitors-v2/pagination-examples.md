# Ejemplos de Paginación - Endpoints de Visitantes

## Endpoints Disponibles

### 1. Visitantes por Tenant (Empresa)
```
GET /api/tenant-visitors/:tenantId/visitors
```

### 2. Visitantes por Sitio
```
GET /api/site-visitors/:siteId/visitors
```

---

## Parámetros de Paginación

| Parámetro | Tipo | Descripción | Default | Límites |
|-----------|------|-------------|---------|---------|
| `limit` | number | Número máximo de visitantes por página | 50 | 1-100 |
| `offset` | number | Número de registros a omitir | 0 | >= 0 |
| `includeOffline` | boolean | Incluir visitantes offline | false | true/false |

---

## Ejemplos Prácticos

### Escenario: 234 visitantes totales

Supongamos que una empresa tiene **234 visitantes** en total y queremos mostrarlos con paginación de **20 por página**.

#### 📄 Página 1 (Primeros 20)
```bash
GET /api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=0
```

**Respuesta:**
```json
{
  "tenantId": "83504359-b783-41dd-bee1-5237c009179d",
  "companyName": "Mi Empresa S.L.",
  "visitors": [
    /* ... 20 visitantes aquí ... */
  ],
  "totalCount": 234,
  "activeSitesCount": 5,
  "timestamp": "2025-10-03T10:30:00.000Z"
}
```

**Cálculo de páginas:**
- Total de páginas: `Math.ceil(234 / 20) = 12 páginas`
- Mostrando: visitantes 1-20 de 234

---

#### 📄 Página 2 (Siguientes 20)
```bash
GET /api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=20
```

**Respuesta:**
```json
{
  "visitors": [
    /* ... 20 visitantes aquí ... */
  ],
  "totalCount": 234
}
```

**Mostrando:** visitantes 21-40 de 234

---

#### 📄 Página 3 (Siguientes 20)
```bash
GET /api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=40
```

**Mostrando:** visitantes 41-60 de 234

---

#### 📄 Página 6 (Media de la lista)
```bash
GET /api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=100
```

**Mostrando:** visitantes 101-120 de 234

---

#### 📄 Última Página (Página 12)
```bash
GET /api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=220
```

**Respuesta:**
```json
{
  "visitors": [
    /* ... solo 14 visitantes aquí ... */
  ],
  "totalCount": 234
}
```

**Mostrando:** visitantes 221-234 de 234 (solo 14 en la última página)

---

## Fórmulas Útiles

### Calcular número de páginas
```javascript
const totalPages = Math.ceil(totalCount / limit);
// Ejemplo: Math.ceil(234 / 20) = 12 páginas
```

### Calcular offset para una página específica
```javascript
const offset = (pageNumber - 1) * limit;
// Página 1: (1 - 1) * 20 = 0
// Página 2: (2 - 1) * 20 = 20
// Página 3: (3 - 1) * 20 = 40
```

### Calcular qué registros se están mostrando
```javascript
const start = offset + 1;
const end = Math.min(offset + visitors.length, totalCount);
// Ejemplo Página 1: "Mostrando 1-20 de 234"
// Ejemplo Última: "Mostrando 221-234 de 234"
```

---

## Ejemplo con JavaScript/TypeScript

### Componente de Paginación Frontend

```typescript
interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

class VisitorPagination {
  private state: PaginationState;
  private tenantId: string;

  constructor(tenantId: string, pageSize: number = 20) {
    this.tenantId = tenantId;
    this.state = {
      currentPage: 1,
      pageSize,
      totalCount: 0
    };
  }

  /**
   * Obtener visitantes de una página específica
   */
  async fetchPage(pageNumber: number): Promise<VisitorsResponse> {
    const offset = (pageNumber - 1) * this.state.pageSize;
    
    const response = await fetch(
      `/api/tenant-visitors/${this.tenantId}/visitors?` +
      `limit=${this.state.pageSize}&offset=${offset}&includeOffline=true`
    );
    
    const data = await response.json();
    
    // Actualizar estado
    this.state.currentPage = pageNumber;
    this.state.totalCount = data.totalCount;
    
    return data;
  }

  /**
   * Ir a la siguiente página
   */
  async nextPage(): Promise<VisitorsResponse> {
    if (!this.hasNextPage()) {
      throw new Error('Ya estás en la última página');
    }
    return this.fetchPage(this.state.currentPage + 1);
  }

  /**
   * Ir a la página anterior
   */
  async previousPage(): Promise<VisitorsResponse> {
    if (!this.hasPreviousPage()) {
      throw new Error('Ya estás en la primera página');
    }
    return this.fetchPage(this.state.currentPage - 1);
  }

  /**
   * Ir a la primera página
   */
  async firstPage(): Promise<VisitorsResponse> {
    return this.fetchPage(1);
  }

  /**
   * Ir a la última página
   */
  async lastPage(): Promise<VisitorsResponse> {
    const totalPages = this.getTotalPages();
    return this.fetchPage(totalPages);
  }

  /**
   * Obtener número total de páginas
   */
  getTotalPages(): number {
    return Math.ceil(this.state.totalCount / this.state.pageSize);
  }

  /**
   * Verificar si hay página siguiente
   */
  hasNextPage(): boolean {
    return this.state.currentPage < this.getTotalPages();
  }

  /**
   * Verificar si hay página anterior
   */
  hasPreviousPage(): boolean {
    return this.state.currentPage > 1;
  }

  /**
   * Obtener información de visualización
   */
  getDisplayInfo(): string {
    const start = (this.state.currentPage - 1) * this.state.pageSize + 1;
    const end = Math.min(
      this.state.currentPage * this.state.pageSize,
      this.state.totalCount
    );
    
    return `Mostrando ${start}-${end} de ${this.state.totalCount} visitantes`;
  }
}
```

### Uso del Componente

```typescript
// Crear instancia
const pagination = new VisitorPagination(
  '83504359-b783-41dd-bee1-5237c009179d',
  20 // 20 visitantes por página
);

// Obtener primera página
const page1 = await pagination.firstPage();
console.log(page1.visitors); // 20 visitantes
console.log(page1.totalCount); // 234
console.log(pagination.getDisplayInfo()); // "Mostrando 1-20 de 234 visitantes"

// Navegar a página 2
const page2 = await pagination.nextPage();
console.log(pagination.getDisplayInfo()); // "Mostrando 21-40 de 234 visitantes"

// Ir a página específica (ej: página 6)
const page6 = await pagination.fetchPage(6);
console.log(pagination.getDisplayInfo()); // "Mostrando 101-120 de 234 visitantes"

// Ir a última página
const lastPage = await pagination.lastPage();
console.log(pagination.getDisplayInfo()); // "Mostrando 221-234 de 234 visitantes"
```

---

## Ejemplo con cURL

### Página 1
```bash
curl -X GET \
  "http://localhost:3000/api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=0&includeOffline=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Página 2
```bash
curl -X GET \
  "http://localhost:3000/api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=20&includeOffline=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Página 5
```bash
curl -X GET \
  "http://localhost:3000/api/tenant-visitors/83504359-b783-41dd-bee1-5237c009179d/visitors?limit=20&offset=80&includeOffline=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Ejemplo con React Component

```tsx
import React, { useState, useEffect } from 'react';

interface Visitor {
  id: string;
  fingerprint: string;
  connectionStatus: 'ONLINE' | 'OFFLINE';
  siteName: string;
  lastActivity: string;
}

interface VisitorsResponse {
  visitors: Visitor[];
  totalCount: number;
  companyName: string;
}

const VisitorsList: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchVisitors = async (page: number) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await fetch(
        `/api/tenant-visitors/${tenantId}/visitors?limit=${pageSize}&offset=${offset}&includeOffline=true`,
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          }
        }
      );
      
      const data: VisitorsResponse = await response.json();
      
      setVisitors(data.visitors);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors(1);
  }, [tenantId]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchVisitors(page);
    }
  };

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="visitors-list">
      <h2>Lista de Visitantes</h2>
      
      {/* Info de paginación */}
      <div className="pagination-info">
        Mostrando {start}-{end} de {totalCount} visitantes
      </div>

      {/* Lista de visitantes */}
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Sitio</th>
              <th>Estado</th>
              <th>Última Actividad</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map(visitor => (
              <tr key={visitor.id}>
                <td>{visitor.fingerprint}</td>
                <td>{visitor.siteName}</td>
                <td>
                  <span className={visitor.connectionStatus === 'ONLINE' ? 'online' : 'offline'}>
                    {visitor.connectionStatus}
                  </span>
                </td>
                <td>{new Date(visitor.lastActivity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Controles de paginación */}
      <div className="pagination-controls">
        <button 
          onClick={() => handlePageChange(1)} 
          disabled={currentPage === 1}
        >
          Primera
        </button>
        
        <button 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage === 1}
        >
          Anterior
        </button>

        <span>
          Página {currentPage} de {totalPages}
        </span>

        <button 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
        >
          Siguiente
        </button>

        <button 
          onClick={() => handlePageChange(totalPages)} 
          disabled={currentPage === totalPages}
        >
          Última
        </button>
      </div>

      {/* Selector de página directa */}
      <div className="page-selector">
        <label>Ir a página: </label>
        <select 
          value={currentPage} 
          onChange={(e) => handlePageChange(Number(e.target.value))}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default VisitorsList;
```

---

## Filtros Adicionales

Puedes combinar la paginación con otros filtros:

### Solo visitantes online (primera página de 50)
```bash
GET /api/tenant-visitors/:tenantId/visitors?limit=50&offset=0&includeOffline=false
```

### Visitantes offline incluidos (página 3 de 20)
```bash
GET /api/tenant-visitors/:tenantId/visitors?limit=20&offset=40&includeOffline=true
```

---

## Casos Especiales

### 1. Primera carga sin saber el total
```javascript
// Primera llamada para conocer el total
const response = await fetch(`/api/tenant-visitors/${tenantId}/visitors?limit=20&offset=0`);
const { visitors, totalCount } = await response.json();

// Ahora puedes calcular cuántas páginas hay
const totalPages = Math.ceil(totalCount / 20);
console.log(`Hay ${totalPages} páginas disponibles`);
```

### 2. Cambiar tamaño de página dinámicamente
```javascript
// Usuario selecciona mostrar 50 por página
const newPageSize = 50;
const offset = 0; // Volver a la primera página

const response = await fetch(
  `/api/tenant-visitors/${tenantId}/visitors?limit=${newPageSize}&offset=${offset}`
);
```

### 3. Búsqueda con paginación
```javascript
// Si implementas búsqueda, los parámetros se mantienen
const searchTerm = 'visitor_123';
const response = await fetch(
  `/api/tenant-visitors/${tenantId}/visitors?` +
  `limit=20&offset=40&includeOffline=true&search=${searchTerm}`
);
```

---

## Mejores Prácticas

1. **Siempre validar límites**
   ```javascript
   const limit = Math.min(Math.max(userLimit, 1), 100); // Entre 1 y 100
   ```

2. **Manejar páginas fuera de rango**
   ```javascript
   if (pageNumber < 1 || pageNumber > totalPages) {
     // Redirigir a primera o última página
     pageNumber = Math.max(1, Math.min(pageNumber, totalPages));
   }
   ```

3. **Mostrar indicador de carga**
   ```javascript
   setLoading(true);
   try {
     const data = await fetchPage(page);
     setVisitors(data.visitors);
   } finally {
     setLoading(false);
   }
   ```

4. **Cachear páginas visitadas** (opcional)
   ```javascript
   const cache = new Map();
   const cacheKey = `${page}-${pageSize}`;
   
   if (cache.has(cacheKey)) {
     return cache.get(cacheKey);
   }
   
   const data = await fetchPage(page);
   cache.set(cacheKey, data);
   return data;
   ```

---

## Testing de Paginación

```typescript
describe('Visitor Pagination', () => {
  it('should fetch first page correctly', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenant-visitors/tenant-id/visitors?limit=20&offset=0')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.visitors).toHaveLength(20);
    expect(response.body.totalCount).toBeGreaterThan(20);
  });

  it('should calculate pages correctly', () => {
    const totalCount = 234;
    const pageSize = 20;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    expect(totalPages).toBe(12);
  });

  it('should handle last page with fewer items', async () => {
    const totalCount = 234;
    const pageSize = 20;
    const lastPageOffset = 220; // Página 12

    const response = await request(app.getHttpServer())
      .get(`/tenant-visitors/tenant-id/visitors?limit=${pageSize}&offset=${lastPageOffset}`)
      .set('Authorization', 'Bearer token');

    expect(response.body.visitors.length).toBe(14); // Solo 14 en la última página
    expect(response.body.totalCount).toBe(234);
  });
});
```

---

## Resumen Rápido

| Acción | URL |
|--------|-----|
| Primera página (20) | `?limit=20&offset=0` |
| Segunda página (20) | `?limit=20&offset=20` |
| Tercera página (20) | `?limit=20&offset=40` |
| Página 6 (20) | `?limit=20&offset=100` |
| Primera página (50) | `?limit=50&offset=0` |
| Segunda página (50) | `?limit=50&offset=50` |
| Con offline incluidos | `?limit=20&offset=0&includeOffline=true` |

**Fórmula:** `offset = (página - 1) × límite`
