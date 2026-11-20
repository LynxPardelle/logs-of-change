---
goal: Logs of Change - microservicios en AWS con Angular SSR en Lambda y revisión de entregas
version: '3.1'
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
| TASK-008 | UI de entregas/revisiones y acta verificable; validar AC01-06 | UI, decisiones y acta JSON probadas en los tres entornos; presentación y aceptación nativas reales y acta oficial verificadas con ZooBeriah Systems. **Pendiente: carga/verificación de medios S3, AC02 sobre adjuntos y conciliación de historia importada para AC06** |
| TASK-009 | Autoridad de escritura, recuperación, congelación de comandos y corte por proyecto | Runbook, congelación y recuperación en tabla nueva comprobados con datos sintéticos; **pendiente autoridad y autorización de corte del proyecto heredado que se migre** |

## Fase 4: frontend en Lambda y operación

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-010 | Marca Logs of Change en paquetes/UI/salud/documentos y dominio por entorno | Implementada la vuelta a Logs of Change; nombres físicos AWS unificados a logsofchange, con guiños originales a cambios y rumbo |
| TASK-011 | Angular SSR Lambda, CloudFront OAC, certificado y DNS; configuración pública y PKCE | Base publicada en los tres entornos; SSR, DNS/TLS, login/callback y QA escritorio/móvil comprobados |
| TASK-012 | Artefactos reproducibles, despliegue independiente y validación CI | Scripts y workflow implementados; CI valida el HEAD publicado de la rama. Ver REMOTE_HANDOFF.md para reproducir y recuperar outputs sin redesplegar |
| TASK-013 | Smoke con identidades sintéticas, TLS/DNS, flujo de revisión y evidencia íntegra | Base verificada en los tres entornos con 12 comprobaciones. Incremento verificado en los tres con 17 comprobaciones, CLI, consola, publicación y retiro; QA escritorio/móvil sin errores y limpieza confirmada por lecturas posteriores. No representa aceptación del piloto real |
| TASK-014 | Promover a testing y después main, con observabilidad y revisión del piloto | Base e incremento promovidos y verificados en producción; corrección de primera activación Plus elevada por PR #347–349 tras pruebas. Piloto nativo real completado en TASK-016. **Pendientes observabilidad operativa y revisión/corte del piloto de migración heredada** |
| TASK-015 | Integraciones de producto y consultas públicas con plan Plus | Completada: API/CLI para proyectos externos, claves limitadas y proyección pública publicadas y verificadas en development, testing y producción. Plus administrado por plataforma, sin cobros automáticos. [Plan del incremento](feature-integrations-public-1.md) y [rollout por entorno](../docs/operations/production-logsofchange.md) |
| TASK-016 | Usar un proyecto propio como piloto nativo real de integración y publicación | Completada 2026-11-19, Ciudad de México: ZooBeriah Systems envió una entrega por CLI/API desde su checkout, cuentas reales distintas presentaron y aceptaron revisión 1, acta oficial verificada y [dashboard público activo](https://logsofchange.lynxpardelle.com/p/zooberiah-systems). Clave temporal revocada y datos reales conservados. [Informe](../docs/operations/pilot-zooberiah-systems.md) |

## Primer flujo pendiente tras el piloto nativo

El piloto nativo de ZooBeriah Systems ya tiene organización, accesos, aprobación actual y publicación verificadas. El siguiente flujo distinto es seleccionar una fuente heredada y su mapeo organizacional, obtener una exportación autorizada y conciliarla (TASK-005), seguido del selector reversible de lectura (TASK-006). Permanecen también las cargas privadas con versiones verificadas (TASK-008) y la gestión administrativa de invitaciones del producto; las invitaciones nativas puntuales del piloto no implementan esa consola de administración.

No se considera completado un criterio por existir su plantilla o por pasar un fixture sintético. Los resultados ejecutados viven en los informes de [desarrollo](../docs/operations/development-logsofchange.md), [testing](../docs/operations/testing-logsofchange.md) y [producción y rollout](../docs/operations/production-logsofchange.md).

## Validación

La validación corriente pasó 137 pruebas Node sin omisiones, 20 Angular, build SSR y cfn-lint de cinco plantillas, incluidas las dos regresiones del alta inicial de Plus. Se comprobaron el bundle Lambda, CLI descargable y 17 recorridos sintéticos por entorno; producción dispone de `verify-production.mjs --approve-production=true --mode=all`, con fuentes de HEAD y recursos validados. Además, el piloto real verificó CLI/API idempotentes, cuentas personales distintas, acta oficial, proyección anónima y SSR, escritorio/móvil sin desbordamiento horizontal ni errores de consola y cierre de su clave temporal. Sus datos reales se conservan; restore y corte de migración se consignan por separado.

## Operación y límites

No se migra tráfico del backend NestJS ni se modifican sus claves. No se inventan decisiones importadas. La publicación productiva requiere rama main y revisión explícita; la elección de marca no demuestra disponibilidad registral. [Runbook](../docs/operations/runbook.md), [Contrato](../docs/architecture/contracts/releases-v1.md), [Migración](../serverless/scripts/migration/README.md).

## Continuación remota

El trabajo nuevo continúa en development; para operar producción se usa main y para pruebas testing, después de su promoción. [REMOTE_HANDOFF.md](../REMOTE_HANDOFF.md) contiene checkout, verificaciones y consulta de outputs públicos. Las correcciones se integran primero en development; se conserva el orden development → testing → main.
