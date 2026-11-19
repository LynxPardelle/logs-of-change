---
goal: Logs of Change - microservicios en AWS con Angular SSR en Lambda y revisión de entregas
version: '2.0'
date_created: 2026-11-17
date_updated: 2026-11-19
status: 'In progress'
tags: [architecture, microservices, serverless, angular, migration, feature]
---

# Plan de Logs of Change

El producto conserva su nombre original **Logs of Change**, identificador `logsofchange`, y su referencia personal a Wind of Change. Todos los identificadores y recursos activos se unifican como logsofchange. Arquitectura objetivo: servicios independientes de identidad, entregas y evidencia con API Gateway/Lambda, DynamoDB por servicio y frontend Angular SSR servido con Lambda detrás de CloudFront OAC. La carpeta, el remoto y el backend NestJS se conservan. Development y testing están publicados y verificados; main permanece sin cambios y producción sigue pendiente. El trabajo nuevo se integra primero en development y se promueve por PR, con merge commit, siguiendo development → testing → main. [Decisión vigente](../docs/architecture/adr/0003-logs-of-change-identidad.md).

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
| TASK-004 | Cognito, AccessTable, tabla de entregas y bucket privado; lecturas con membresía/proyecto/rol y acceso cruzado | Implementada y desplegada en development y testing; lectura, JWT y aislamiento comprobados en smoke real sintético de cada entorno |
| TASK-005 | Exportar explícitamente una fuente de sólo lectura, normalizar, detectar huérfanos/colisiones y conciliar | Herramientas y fixture sintético implementados; **pendiente exportación de origen real, carga acotada y paridad del piloto** |
| TASK-006 | Contrato HTTP v1 y selección de lectura reversible por proyecto | Contrato publicado en docs; **pendiente selector origen/proyección y demostración de reversión del piloto** |

## Fase 3: flujo de revisión

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-007 | Presentación, decisión, nuevas revisiones y recibos idempotentes; carreras y clave con cuerpo diferente | Implementada, pruebas locales y cloud pasadas: idempotencia, carreras, historial y decisión única |
| TASK-008 | UI de entregas/revisiones y acta verificable; validar AC01-06 | UI, decisiones y acta JSON probadas en development y testing; **pendiente: carga/verificación de medios S3, AC02 sobre adjuntos y aceptación de AC06 con piloto real** |
| TASK-009 | Autoridad de escritura, recuperación, congelación de comandos y corte por proyecto | Runbook, congelación y recuperación en tabla nueva comprobados con datos sintéticos; **pendiente autoridad y autorización de corte del proyecto real** |

## Fase 4: frontend en Lambda y operación

| Tarea | Entregable | Estado |
| --- | --- | --- |
| TASK-010 | Marca Logs of Change en paquetes/UI/salud/documentos y dominio por entorno | Implementada la vuelta a Logs of Change; nombres físicos AWS unificados a logsofchange, con guiños originales a cambios y rumbo |
| TASK-011 | Angular SSR Lambda, CloudFront OAC, certificado y DNS; configuración pública y PKCE | Implementada y desplegada en development y testing; SSR, DNS/TLS, login/callback y QA escritorio/móvil comprobados en ambos |
| TASK-012 | Artefactos reproducibles, despliegue independiente y validación CI | Scripts y workflow implementados; CI valida el HEAD publicado de la rama. Ver REMOTE_HANDOFF.md para reproducir y recuperar outputs sin redesplegar |
| TASK-013 | Smoke con identidades sintéticas, TLS/DNS, flujo de revisión y evidencia íntegra | Completada en development y testing:12 comprobaciones por entorno, incluyendo aprobación completa por UI y conservación de actas anteriores. Datos sintéticos limpiados; [desarrollo](../docs/operations/development-logsofchange.md) y [testing](../docs/operations/testing-logsofchange.md). No representa aceptación del piloto real |
| TASK-014 | Promover a testing y después main, con observabilidad y revisión del piloto | **Parcial**: development promovido por PR #337 a testing, desplegado y verificado con CI correcta. **Pendientes main/producción, observabilidad y revisión del piloto**; main conserva su referencia anterior |

## Primer flujo pendiente tras la base implementada

Seleccionar un proyecto piloto y su organización, obtener una exportación autorizada, validar la proyección y conciliar contra el origen real (TASK-005), seguido del selector reversible (TASK-006). Los siguientes incrementos de código independientes son cargas privadas con versiones verificadas (TASK-008) y gestión administrativa de invitaciones sin habilitar acceso público.

No se considera completado un criterio por existir su plantilla o por pasar un fixture sintético. Los resultados ejecutados y los recursos efectivamente desplegados viven en los informes de [desarrollo](../docs/operations/development-logsofchange.md) y [testing](../docs/operations/testing-logsofchange.md).

## Validación

`node --test serverless/test/*.test.mjs`, tests Angular y build SSR, pruebas de invocación del bundle Lambda, cfn-lint de los cuatro templates y smoke desplegado con usuarios/datos sintéticos. Validaciones de datos reales, restore y corte se consignan con su alcance exacto.

## Operación y límites

No se migra tráfico del backend NestJS ni se modifican sus claves. No se inventan decisiones importadas. La publicación productiva requiere rama main y revisión explícita; la elección de marca no demuestra disponibilidad registral. [Runbook](../docs/operations/runbook.md), [Contrato](../docs/architecture/contracts/releases-v1.md), [Migración](../serverless/scripts/migration/README.md).

## Continuación remota

La rama para continuar el trabajo nuevo es development; el checkout al cerrar la promoción queda en testing para operar el entorno de pruebas. [REMOTE_HANDOFF.md](../REMOTE_HANDOFF.md) contiene checkout, pruebas, consulta de outputs públicos AWS y pendientes. La integración y las correcciones se revisan primero contra development; no se modifica el orden development → testing → main.
