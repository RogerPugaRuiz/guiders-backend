// Script para probar carga real de JavaScript con Playwright
// Requiere: npm install playwright

const { chromium } = require('playwright');

async function runBrowserLoadTest() {
  const browser = await chromium.launch({ headless: true });
  const numUsers = 10; // Número de usuarios simulados
  const baseUrl = 'http://localhost:8080';
  
  console.log(`🚀 Iniciando test con ${numUsers} usuarios simulados`);
  
  const promises = [];
  
  for (let i = 0; i < numUsers; i++) {
    promises.push(simulateUser(browser, baseUrl, i));
  }
  
  try {
    await Promise.all(promises);
    console.log('✅ Test completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el test:', error);
  } finally {
    await browser.close();
  }
}

async function simulateUser(browser, baseUrl, userId) {
  const context = await browser.newContext({
    userAgent: `LoadTest-User-${userId}`,
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`👤 Usuario ${userId}: Navegando a ${baseUrl}`);
    
    // Navegar a la página
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Esperar a que cargue el contenido básico
    await page.waitForTimeout(1000);
    
    // Verificar que la página se cargó correctamente
    const title = await page.title();
    console.log(`👤 Usuario ${userId}: Título de página: "${title}"`);
    
    // Verificar si hay scripts cargados (más genérico)
    const scriptsLoaded = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      return scripts.length;
    });
    
    console.log(`👤 Usuario ${userId}: ${scriptsLoaded} scripts encontrados`);
    
    // Verificar si hay elementos específicos en la página
    const hasFeatures = await page.evaluate(() => {
      const features = document.querySelector('.features-grid');
      const hero = document.querySelector('.hero-banner');
      return { features: !!features, hero: !!hero };
    });
    
    if (hasFeatures.hero) {
      console.log(`✅ Usuario ${userId}: Hero banner encontrado`);
    }
    
    if (hasFeatures.features) {
      console.log(`✅ Usuario ${userId}: Features grid encontrado`);
    }
    
    // Simular interacciones reales del usuario
    await page.evaluate(() => {
      // Simular scroll
      window.scrollTo(0, 500);
    });
    
    await page.waitForTimeout(1000);
    
    // Intentar hacer click en un botón si existe
    const buttonExists = await page.locator('.btn-primary').first().isVisible().catch(() => false);
    if (buttonExists) {
      console.log(`👤 Usuario ${userId}: Haciendo click en botón principal`);
      await page.locator('.btn-primary').first().click();
      await page.waitForTimeout(500);
    }
    
    // Simular más tiempo de navegación
    await page.waitForTimeout(2000);
    
    // Verificar métricas de rendimiento
    const metrics = await page.evaluate(() => {
      const performance = window.performance;
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0
      };
    });
    
    console.log(`📊 Usuario ${userId}: Tiempo de carga: ${metrics.loadTime}ms, DOM: ${metrics.domContentLoaded}ms`);
    
    console.log(`✅ Usuario ${userId}: Sesión completada exitosamente`);
    
  } catch (error) {
    console.error(`❌ Usuario ${userId}: Error -`, error.message);
  } finally {
    await context.close();
  }
}

// Ejecutar el test
if (require.main === module) {
  runBrowserLoadTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runBrowserLoadTest };
