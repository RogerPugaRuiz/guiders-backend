# Guía de Integración BFF + OIDC para SPAs Frontend

## 📋 Introducción

Esta guía explica cómo integrar tu **Single Page Application (SPA)** con el **Backend For Frontend (BFF)** que implementa autenticación **OpenID Connect (OIDC)** con **cookies HttpOnly**.

El patrón BFF mejora la seguridad al mantener los tokens JWT fuera del alcance de JavaScript en el navegador, protegiéndolos contra ataques XSS.

## 🔧 Configuración Requerida

### 1. Configuración de CORS en el Cliente HTTP

Asegúrate de que todas las peticiones HTTP incluyan credenciales para que las cookies se envíen automáticamente:

```javascript
// Configuración global con Axios
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // ← Importante: envía cookies automáticamente
  timeout: 10000,
});

export default apiClient;
```

```javascript
// Configuración global con Fetch
const fetchWithCredentials = (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include', // ← Importante: incluye cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};
```

### 2. Variables de Entorno del Frontend

```bash
# .env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_BFF_AUTH_URL=http://localhost:3000/api/bff/auth
REACT_APP_ENVIRONMENT=development
```

## 🔐 API de Autenticación BFF

### Endpoints Disponibles

| Método | Endpoint | Descripción | Cookies |
|--------|----------|-------------|---------|
| `POST` | `/bff/auth/login` | Iniciar sesión con credenciales | ✅ Configura |
| `POST` | `/bff/auth/refresh` | Renovar token de acceso | ✅ Actualiza |
| `POST` | `/bff/auth/logout` | Cerrar sesión | ❌ Limpia |
| `GET` | `/bff/auth/me` | Obtener usuario autenticado | 📖 Lee |

## 💡 Implementación en React/Vue/Angular

### 1. Servicio de Autenticación

```javascript
// services/authService.js
class AuthService {
  constructor(httpClient) {
    this.http = httpClient;
    this.baseURL = process.env.REACT_APP_BFF_AUTH_URL;
  }

  /**
   * Iniciar sesión con username/password
   * @param {string} username - Email o nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise<{success: boolean, user: object}>}
   */
  async login(username, password) {
    try {
      const response = await this.http.post(`${this.baseURL}/login`, {
        username,
        password,
      });

      if (response.data.success) {
        // Las cookies HttpOnly se configuran automáticamente
        return {
          success: true,
          user: response.data.user,
        };
      }

      throw new Error(response.data.message || 'Error en el login');
    } catch (error) {
      console.error('Error en login:', error);
      throw new Error(
        error.response?.data?.message || 'Error de conexión'
      );
    }
  }

  /**
   * Obtener información del usuario autenticado
   * @returns {Promise<{success: boolean, user: object}>}
   */
  async getCurrentUser() {
    try {
      const response = await this.http.get(`${this.baseURL}/me`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expirado o no válido
        return { success: false, user: null };
      }
      throw error;
    }
  }

  /**
   * Renovar token de acceso
   * @returns {Promise<{success: boolean}>}
   */
  async refreshToken() {
    try {
      const response = await this.http.post(`${this.baseURL}/refresh`);
      return response.data;
    } catch (error) {
      console.error('Error renovando token:', error);
      return { success: false };
    }
  }

  /**
   * Cerrar sesión
   * @returns {Promise<{success: boolean}>}
   */
  async logout() {
    try {
      const response = await this.http.post(`${this.baseURL}/logout`);
      // Las cookies se limpian automáticamente
      return response.data;
    } catch (error) {
      console.error('Error en logout:', error);
      // Incluso si hay error, consideramos logout exitoso
      return { success: true };
    }
  }

  /**
   * Verificar si el usuario está autenticado
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      const result = await this.getCurrentUser();
      return result.success && !!result.user;
    } catch (error) {
      return false;
    }
  }
}

export default AuthService;
```

### 2. Hook de React para Autenticación

```javascript
// hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from 'react';
import AuthService from '../services/authService';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const authService = new AuthService(apiClient);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const result = await authService.getCurrentUser();
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      const result = await authService.login(username, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, error: 'Credenciales inválidas' };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      
      // Redirigir a login
      window.location.href = '/login';
    }
  };

  const refreshAuth = async () => {
    return await checkAuthStatus();
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshAuth,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
```

### 3. Componente de Login

```javascript
// components/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginForm = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!credentials.username || !credentials.password) {
      setError('Por favor, completa todos los campos');
      return;
    }

    const result = await login(credentials.username, credentials.password);
    
    if (!result.success) {
      setError(result.error || 'Error en el login');
    }
    // Si success=true, el hook redirigirá automáticamente
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Iniciar Sesión</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="username">Email o Usuario:</label>
        <input
          id="username"
          name="username"
          type="text"
          value={credentials.username}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Contraseña:</label>
        <input
          id="password"
          name="password"
          type="password"
          value={credentials.password}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      <button type="submit" disabled={loading} className="login-button">
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
};

export default LoginForm;
```

### 4. Guard de Rutas Protegidas

```javascript
// components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-spinner">
        <div>Verificando autenticación...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guardar la URL de destino para redirigir después del login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
```

## 🔄 Interceptores HTTP para Manejo de Errores

### Interceptor Axios con Renovación Automática

```javascript
// services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  timeout: 10000,
});

// Interceptor de respuesta para manejar tokens expirados
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es error 401 y no hemos intentado renovar ya
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Intentar renovar el token
        await apiClient.post('/bff/auth/refresh');
        
        // Reintentar la petición original
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Si no se puede renovar, redirigir a login
        console.error('Error renovando token:', refreshError);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

## 🚀 Configuración de Routing

```javascript
// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginForm />} />
            
            {/* Rutas protegidas */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            {/* Redirección por defecto */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

## 🛡️ Características de Seguridad

### 1. Cookies HttpOnly

```javascript
// ❌ NO HAGAS ESTO - Los tokens NO son accesibles desde JavaScript
localStorage.getItem('access_token'); // undefined
document.cookie; // No contiene tokens sensibles

// ✅ CORRECTO - Las cookies se manejan automáticamente
fetch('/api/protected-resource', { credentials: 'include' });
```

### 2. Renovación Automática

```javascript
// El interceptor maneja automáticamente la renovación
// No necesitas código manual para renovar tokens

// La renovación es transparente para el usuario
apiClient.get('/api/users') // Si el token expira, se renueva automáticamente
  .then(response => {
    console.log('Datos obtenidos:', response.data);
  });
```

### 3. Logout Seguro

```javascript
// El logout limpia todas las cookies automáticamente
const handleLogout = async () => {
  await authService.logout();
  // Las cookies se limpian en el backend
  // El frontend solo necesita actualizar el estado
};
```

## 🔍 Debugging y Troubleshooting

### Verificar Estado de Autenticación

```javascript
// Debug en consola del navegador
const debugAuth = async () => {
  try {
    const response = await fetch('/api/bff/auth/me', { 
      credentials: 'include' 
    });
    const data = await response.json();
    console.log('Auth Status:', data);
  } catch (error) {
    console.error('Auth Error:', error);
  }
};

// Llamar en consola
debugAuth();
```

### Logs de Red

```javascript
// Verificar que credentials: include esté en todas las peticiones
// En DevTools > Network, verificar:
// 1. Request headers contienen cookies
// 2. Response headers contienen Set-Cookie (en login/refresh)
// 3. No hay errores CORS
```

## 📱 Consideraciones para Diferentes Frameworks

### Vue.js

```javascript
// stores/auth.js (con Pinia)
import { defineStore } from 'pinia';
import AuthService from '../services/authService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
  }),

  actions: {
    async login(username, password) {
      this.loading = true;
      try {
        const result = await AuthService.login(username, password);
        if (result.success) {
          this.user = result.user;
          this.isAuthenticated = true;
        }
        return result;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      await AuthService.logout();
      this.user = null;
      this.isAuthenticated = false;
    },
  },
});
```

### Angular

```typescript
// services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post('/api/bff/auth/login', { username, password }, {
      withCredentials: true // ← Importante para cookies
    });
  }

  getCurrentUser(): Observable<any> {
    return this.http.get('/api/bff/auth/me', { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post('/api/bff/auth/logout', {}, { withCredentials: true });
  }
}
```

## ✅ Checklist de Integración

- [ ] Configurar `withCredentials: true` o `credentials: 'include'`
- [ ] Implementar AuthService con métodos login/logout/getCurrentUser
- [ ] Crear hook/store/service de autenticación
- [ ] Configurar interceptor para renovación automática
- [ ] Implementar guards para rutas protegidas
- [ ] Manejar estados de loading y error
- [ ] Configurar redirecciones después de login/logout
- [ ] Testear flujo completo en development y production

## 🔗 Enlaces Útiles

- **Documentación BFF**: `/docs/bff-httponly-cookies-guide.md`
- **Plan de Implementación**: `/docs/bff-implementation-plan.md`
- **API Endpoints**: `http://localhost:3000/docs` (Swagger)
- **Estado de Health Check**: `http://localhost:3000/api/health`

¿Necesitas ayuda con algún framework específico o tienes preguntas sobre la implementación?
