# Product Brief: GUIDE Tokens

## Resumen Ejecutivo

GUIDE Tokens es un sistema de créditos internos para la plataforma Guiders que transforma el modelo de monetización actual de suscripción flat en un modelo de suscripción + consumo variable. El cliente paga su suscripción mensual en fiat y recibe un pool de GUIDE tokens que consume dentro del producto para acceder a features premium: respuestas IA, lead scoring automático, exportaciones de datos y analytics avanzado.

El modelo no requiere blockchain ni criptomonedas en su fase inicial — es técnicamente equivalente a los créditos de OpenAI o las resoluciones de Intercom, pero con posicionamiento aspiracional hacia Web3 en fases futuras. El nombre "GUIDE tokens" mantiene esa visión estratégica sin comprometer la simplicidad del MVP.

La idea surge de explorar cómo incorporar tecnología cripto a Guiders. Tras evaluar múltiples líneas (pagos cripto, tokenomics completos, Web3 para dApps, datos on-chain), se seleccionó este modelo por ser el de menor fricción, mayor claridad de valor para clientes B2B y menor riesgo regulatorio.

## El Problema

Los planes de suscripción flat no reflejan el valor real que cada cliente extrae de la plataforma. Un cliente que usa intensivamente el lead scoring con IA y otro que solo hace chat básico pagan lo mismo. Esto genera dos fricciones:

- **Para Guiders**: revenue no capturado en clientes de alto uso; sin mecanismo de upsell natural dentro del producto.
- **Para el cliente**: sensación de pagar por features que no usa; sin control granular del presupuesto por equipo o agente.

Adicionalmente, los planes diferenciados hoy son difíciles de justificar si las features premium no tienen un coste visible y percibido.

## La Solución

Un pool mensual de GUIDE tokens incluido en cada plan, consumible en features de alto valor:

| Feature | Coste en tokens |
|---|---|
| Respuesta IA en chat | 2 tokens |
| Lead scoring automático | 5 tokens |
| Resumen de conversación IA | 3 tokens |
| Export de leads (CSV) | 10 tokens |
| Analytics avanzado | 1 token/consulta |

**Pools por plan:**
- Basic → 500 tokens/mes
- Pro → 2.000 tokens/mes
- Enterprise → custom

El chat básico nunca se bloquea. Solo las features premium requieren tokens. Cuando el pool se agota, el cliente recibe alertas (al 20%, 10% y 0%) y puede comprar tokens adicionales (top-up) o subir de plan.

Los admins pueden asignar límites de tokens por usuario o agente dentro del pool de la empresa.

## Qué lo Diferencia

- **Primer mover**: Ningún competidor directo (Intercom, Drift, Crisp, HubSpot) tiene un sistema de tokens con visión Web3.
- **Switching cost elevado**: Un cliente con tokens acumulados y hábitos de consumo formados no abandona fácilmente la plataforma.
- **Posicionamiento aspiracional**: El nombre "GUIDE tokens" posiciona a Guiders como plataforma con visión de futuro sin la complejidad técnica y legal de Web3 hoy.
- **Modelo de negocio dual**: Ingresos recurrentes (suscripción) + ingresos variables (top-up) sin cambiar la propuesta de valor core.

## A Quién Sirve

**Usuario primario — Head of Sales / Revenue Operations (empresa 50-500 empleados)**
Necesita controlar el gasto en herramientas SaaS, delegar uso a su equipo y justificar el ROI de la plataforma a su CFO. Los tokens le dan visibilidad y control de presupuesto que hoy no tiene.

**Usuario secundario — Agente de ventas / chat**
Usa las features IA del chat a diario. Percibe el token como "crédito de uso" — intuitivo y sin fricción si el coste por acción es visible antes de ejecutar.

**Stakeholder financiero — CFO**
No interactúa con el producto pero aprueba el presupuesto. La suscripción fija + pool de créditos es un modelo que entiende y puede presupuestar. Sin exposición a volatilidad cripto.

## Criterios de Éxito

- **Adopción**: >60% de clientes Pro y Enterprise consumen >50% de su pool mensual
- **Top-up**: >5% de clientes compran tokens adicionales al mes (señal de modelo viable)
- **Retención**: Reducción del churn en clientes con consumo activo de tokens vs. clientes sin consumo
- **ARPU**: Incremento del ingreso medio por cuenta gracias al top-up
- **Soporte**: Volumen de tickets sobre "¿por qué no puedo usar X feature?" se reduce tras implementación (claridad del modelo)

## Alcance

**Incluido en V1:**
- Pool de tokens por empresa con reposición automática mensual (webhook Stripe)
- Deducción de tokens en features: respuestas IA, lead scoring, exports, resúmenes IA
- Dashboard de consumo: tokens restantes, historial por feature, proyección del mes
- Alertas de bajo balance (20%, 10%, 0%)
- Top-up manual de tokens adicionales
- Límites configurables por usuario/agente dentro del pool

**Explícitamente fuera de V1:**
- Blockchain o tokenización on-chain
- Transferencia de tokens entre empresas
- Mercado secundario de tokens
- DAO de gobernanza
- Tokens como medio de pago de suscripción

## Regulación

**Fase actual (off-chain, no transferible): Riesgo mínimo.**

Los GUIDE tokens son créditos de plataforma equivalentes a los de OpenAI o Adobe. No son instrumentos financieros. Requisito único: redactar TOS claramente indicando que los tokens no son canjeables por dinero y no tienen valor fuera de la plataforma.

**Evolución futura hacia Web3:**

| Característica añadida | Riesgo regulatorio |
|---|---|
| Transferibles entre empresas | Medio |
| Canjeables por fiat | Alto (PSD2/EMD en Europa) |
| On-chain / blockchain | Alto (MiCA — utility token) |
| Precio variable / mercado secundario | Muy alto (MiFID II) |

Si en el futuro se tokeniza on-chain bajo MiCA (Europa): publicar whitepaper, notificación al regulador (CNMV en España), KYC/KYB de holders, geofencing para USA. Coste estimado: €30.000–€100.000 y 6–18 meses de proceso legal.

## Implementación Técnica

**Esfuerzo estimado: ~1 semana de desarrollo backend.**

Nuevo bounded context `token-ledger` siguiendo el patrón DDD+CQRS existente:

```
src/context/token-ledger/
├── domain/
│   ├── TokenAccount.aggregate.ts    # Pool por empresa
│   ├── TokenBalance.ts              # Value object saldo
│   └── TokensConsumed.event.ts
├── application/
│   ├── DebitTokens.command.ts       # Consumir tokens
│   ├── CreditTokens.command.ts      # Recargar pool
│   └── GetTokenBalance.query.ts
└── infrastructure/
    ├── MongoTokenAccountRepo.ts
    └── TokenLedger.controller.ts
```

| Componente | Esfuerzo |
|---|---|
| Dominio + comandos/queries | 2–3 días |
| Integración Stripe webhook (renovación) | 1 día |
| Middleware de validación por feature | 1–2 días |
| Dashboard de consumo (API) | 1 día |
| **Total backend** | **~1 semana** |

El SDK no gestiona tokens directamente. El backend devuelve el saldo actualizado en cada respuesta. El SDK puede mostrar opcionalmente un badge de tokens restantes en el widget de chat.

## Visión

En 12–18 meses, si el modelo de tokens tiene tracción real con los clientes:

1. **Blockchain privada**: registro inmutable y auditable de transacciones de tokens sin riesgo regulatorio adicional.
2. **Web3 público**: tokenización on-chain en Polygon o Base, tokens transferibles entre empresas, marketplace secundario.
3. **DAO de gobernanza**: clientes con tokens stakeados votan el roadmap de features — alineación de incentivos entre Guiders y su base de clientes B2B.

La secuencia correcta es: validar el modelo off-chain → escalar → decidir con datos si Web3 aporta valor de negocio suficiente para justificar el coste legal y técnico.

---

*Brief generado en sesión de brainstorming + roundtable con agentes PM (John) y Business Analyst (Mary). Fecha: Abril 2026. Estado: Idea estratégica — pendiente de priorización.*
