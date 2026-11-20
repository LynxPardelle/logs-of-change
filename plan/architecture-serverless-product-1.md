---
goal: Logs of Change - microservicios en AWS con Angular SSR en Lambda y revisión de entregas
version: '3.0'
date_created: 2026-11-17
date_updated: 2026-11-19
status: 'In progress'
tags: [architecture, microservices, serverless, angular, migration, feature]
---

# Plan de Logs of Change

El producto conserva su nombre original **Logs of Change**, identificador `logsofchange`, y su referencia personal a Wind of Change. Los identificadores y recursos activos usan logsofchange. La arquitectura usa servicios independientes de identidad, entregas, evidencia y publicaciones con API Gateway/Lambda, DynamoDB por servicio y frontend Angular SSR en Lambda detrás de CloudFront OAC. La carpeta, el remoto y el backend NestJS se conservan. La base está publicada y verificada en development, testing y producción; el [registro de rollout](../docs/operations/production-logsofchange.md) acredita por entorno el incremento de integraciones y dashboards. El trabajo nuevo se integra primero en development y se promueve por PR, con merge commit, siguiendo development → testing → main.

## Requisitos y restricciones

- **REQ-001** Angular 22 + NgRx SignalStore, SSR real en Lambda Node.js24 ARM64 y APIs relativas del mismo origen.
- **REQ-002** Microservicios con plantillas SAM, APIs, permisos y despliegues propios; evidencia consulta HTTP de entregas, sin acceso a su tabla.
- **REQ-003** Un manifiesto inmutable identifica cada revisión presentada. La decisión conserva actor, fecha y digest de esa versión.
- **REQ-004** Reintentos idempotentes y concurrencia transaccional; una única decisión por revisión y prohibición de autoaprobación.
- **SEC-001** OIDC Code+PKCE, JWT de acceso, pertenencia y rol activos por organización/proyecto en lecturas y comandos.
- **CON-001** Preservar contratos y árbol heredados, fuentes en sólo lectura y un escritor por entidad durante la migración.
- **CON-002** No aceptar adjuntos sin verificar bytes, tipo/tamaño/hash y versión S3.
- **OPS-001** Promoción **development → testing → main**. Stacks y dominios aislados; no sustituir recursos de otros proyectos.
- **OPS-002** Desarrollo `dev.logsofchange.lynxpardelle.com`, pruebas `test.logsofchange.lynxpardelle.com`, producción `logsofchange.lynxpardelle.com`; ACM en us-east-1 y DNS propio.

## Fase 1: base inicial

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-001 | SAM y GET /api/v1/health con contrato e infraestructura validados | Completada inicialmente 2026-11-17; identidad actual logsofchange |
| TASK-002 | Angular + SignalStore y pruebas de salud/fallo/reintento | Completada inicialmente 2026-11-17; ampliada a SSR y producto |
| TASK-003 | Producto, arquitectura, inventario y decisión de migración | Completada; actualizada con ADR0002 y separación de microservicios |

## Fase 2: identidad, lectura y conciliación

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-004 | Cognito, AccessTable, tabla de entregas y bucket privado; lecturas con membresía/proyecto/rol y acceso cruzado | Base implementada y desplegada en los tres entornos; lectura, JWT y aislamiento comprobados con datos sintéticos |
| TASK-005 | Exportar explícitamente una fuente de sólo lectura, normalizar, detectar huérfanos/colisiones y conciliar | Herramientas y fixture sintético implementados; **pendiente exportación de origen real, carga acotada y paridad del piloto** |
| TASK-006 | Contrato HTTP v1 y selección de lectura reversible por proyecto | Contrato publicado en docs; **pendiente selector origen/proyección y demostración de reversión del piloto** |

## Fase 3: flujo de revisión

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-007 | Presentación, decisión, nuevas revisiones y recibos idempotentes; carreras y clave con cuerpo diferente | Implementada, pruebas locales y cloud pasadas: idempotencia, carreras, historial y decisión única |
| TASK-008 | UI de entregas/revisiones y acta verificable; validar AC01-06 | UI, decisiones y acta JSON de la base probadas en los tres entornos; **pendiente: carga/verificación de medios S3, AC02 sobre adjuntos y aceptación de AC06 con piloto real** |
| TASK-009 | Autoridad de escritura, recuperación, congelación de comandos y corte por proyecto | Runbook, congelación y recuperación en tabla nueva comprobados con datos sintéticos; **pendiente autoridad y autorización de corte del proyecto real** |

## Fase 4: frontend en Lambda y operación

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-010 | Marca Logs of Change en paquetes/UI/salud/documentos y dominio por entorno | Implementada la vuelta a Logs of Change; nombres físicos AWS unificados a logsofchange, con guiños originales a cambios y rumbo |
| TASK-011 | Angular SSR Lambda, CloudFront OAC, certificado y DNS; configuración pública y PKCE | Base publicada en los tres entornos; SSR, DNS/TLS, login/callback y QA escritorio/móvil comprobados |
| TASK-012 | Artefactos reproducibles, despliegue independiente y validación CI | Scripts y workflow implementados; CI valida el HEAD publicado de la rama. Ver REMOTE_HANDOFF.md para reproducir y recuperar outputs sin redesplegar |
| TASK-013 | Smoke con identidades sintéticas, TLS/DNS, flujo de revisión y evidencia íntegra | Base verificada en los tres entornos con 12 comprobaciones. Incremento verificado en los tres con 17 comprobaciones, CLI, consola, publicación y retiro; QA escritorio/móvil sin errores y limpieza confirmada por lecturas posteriores. No representa aceptación del piloto real |
| TASK-014 | Promover a testing y después main, con observabilidad y revisión del piloto | Base promovida por PR #339; incremento elevado por development → testing → main, PR #340–343, y producción verificada en 5b30c8633bd2e1311f266206e300b1a5032acbc6. **Pendientes observabilidad operativa y revisión del piloto real** |
| TASK-015 | Integraciones de producto y consultas públicas con plan Plus | Completada: API/CLI para proyectos externos, claves limitadas y proyección pública publicadas y verificadas en development, testing y producción. Plus administrado por plataforma, sin cobros automáticos. [Plan del incremento](feature-integrations-public-1.md) y [rollout por entorno](../docs/operations/production-logsofchange.md) |

## Primer flujo pendiente tras el incremento publicado

Seleccionar un proyecto piloto y su organización, obtener una exportación autorizada, validar la proyección y conciliar contra el origen real (TASK-005), seguido del selector reversible (TASK-006). Los siguientes incrementos de código independientes son cargas privadas con versiones verificadas (TASK-008) y gestión administrativa de invitaciones sin habilitar acceso público.

No se considera completado un criterio por existir su plantilla o por pasar un fixture sintético. Los resultados ejecutados viven en los informes de [desarrollo](../docs/operations/development-logsofchange.md), [testing](../docs/operations/testing-logsofchange.md) y [producción y rollout](../docs/operations/production-logsofchange.md).

## Validación

La CI del incremento pasó 135 pruebas Node sin omisiones, 20 Angular, build SSR y cfn-lint de cinco plantillas. Se comprobaron el bundle Lambda, CLI descargable y 17 recorridos integrados con datos sintéticos en cada entorno. Producción usó `verify-production.mjs --approve-production=true --mode=all`, con fuentes de HEAD y recursos validados. El informe registra los commits y la limpieza; datos reales, restore y corte se consignan con su alcance exacto.

## Operación y límites

No se migra tráfico del backend NestJS ni se modifican sus claves. No se inventan decisiones importadas. La publicación productiva requiere rama main y revisión explícita; la elección de marca no demuestra disponibilidad registral. [Runbook](../docs/operations/runbook.md), [Contrato](../docs/architecture/contracts/releases-v1.md), [Migración](../serverless/scripts/migration/README.md).

## Continuación remota

El trabajo nuevo continúa en development; para operar producción se usa main y para pruebas testing, después de su promoción. [REMOTE_HANDOFF.md](../REMOTE_HANDOFF.md) contiene checkout, verificaciones y consulta de outputs públicos. Las correcciones se integran primero en development; se conserva el orden development → testing → main.
