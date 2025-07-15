module.exports = {
  /**
   * Genera un visitante aleatorio con datos únicos
   * Simula un usuario real con identificadores únicos
   */
  generateRandomVisitor: function(requestParams, context, ee, next) {
    // Generar ID único de visitante
    context.vars.visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15);
    
    // Generar ID de sesión único
    context.vars.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    
    // Generar User-Agent realista
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    ];
    
    context.vars.userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Simular diferentes tipos de dispositivos
    const devices = ['desktop', 'tablet', 'mobile'];
    context.vars.device = devices[Math.floor(Math.random() * devices.length)];
    
    // Simular diferentes páginas de entrada
    const entryPages = ['/', '/productos', '/servicios', '/contacto', '/sobre-nosotros'];
    context.vars.entryPage = entryPages[Math.floor(Math.random() * entryPages.length)];
    
    // Simular diferentes idiomas
    const languages = ['es-ES', 'en-US', 'fr-FR', 'de-DE'];
    context.vars.language = languages[Math.floor(Math.random() * languages.length)];
    
    return next();
  },

  /**
   * Simula el comportamiento de un visitante que permanece en el sitio
   */
  simulateVisitorStay: function(requestParams, context, ee, next) {
    // Tiempo de permanencia aleatorio entre 10 y 300 segundos
    const stayTime = Math.floor(Math.random() * 290) + 10;
    context.vars.stayTime = stayTime;
    
    return next();
  },

  /**
   * Genera datos de tracking realistas
   */
  generateTrackingData: function(requestParams, context, ee, next) {
    // Simular diferentes eventos de tracking
    const events = [
      'page_view',
      'button_click',
      'form_focus',
      'scroll_depth',
      'time_on_page'
    ];
    
    context.vars.trackingEvent = events[Math.floor(Math.random() * events.length)];
    
    // Simular coordenadas de mouse
    context.vars.mouseX = Math.floor(Math.random() * 1920);
    context.vars.mouseY = Math.floor(Math.random() * 1080);
    
    // Simular scroll position
    context.vars.scrollPosition = Math.floor(Math.random() * 100);
    
    return next();
  },

  /**
   * Simula errores ocasionales para testing realista
   */
  simulateOccasionalErrors: function(requestParams, context, ee, next) {
    // 5% de probabilidad de simular un error de red
    if (Math.random() < 0.05) {
      context.vars.simulateError = true;
      // Simular timeout o conexión lenta
      requestParams.timeout = Math.random() < 0.5 ? 1000 : 30000;
    }
    
    return next();
  },

  /**
   * Logging personalizado para debugging
   */
  logVisitorActivity: function(requestParams, context, ee, next) {
    if (process.env.ARTILLERY_DEBUG) {
      console.log(`[${new Date().toISOString()}] Visitante ${context.vars.visitorId} - Sesión: ${context.vars.sessionId}`);
      console.log(`  Device: ${context.vars.device}, Language: ${context.vars.language}`);
      console.log(`  Entry Page: ${context.vars.entryPage}`);
    }
    
    return next();
  }
};
