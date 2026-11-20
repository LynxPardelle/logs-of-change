---
goal: Integraciones portables y dashboards publicos de Logs of Change
version: 1
date_created: 2026-11-19
last_updated: 2026-11-19
owner: Logs of Change
status: 'Completed'
tags: [feature, integrations, publications, security]
---
# Introduction
![Status: Completed](https://img.shields.io/badge/status-Completed-green)
El diseño autorizado para clientes externos está implementado, publicado y verificado en development, testing y producción. La revisión `5b30c8633bd2e1311f266206e300b1a5032acbc6` se promovió a main y se desplegó en seis stacks; el runner de producción completó QA y 17 comprobaciones con limpieza y lecturas posteriores cero. El cierre corresponde al 2026-11-19 en Ciudad de México, 2026-11-20 a las 00:03:35.677 UTC.
## 1. Requirements & Constraints
- REQ-001: API y CLI portables, borradores privados, aprobacion humana, publicacion explicita.
- SEC-001: Claves de 256 bits almacenadas como hash, caducidad/revocación, aislamiento y autorización transaccional.
- CON-001: Plus asignado por plataforma, sin billing simulado; conservar flujo de promocion.
## 2. Implementation Steps
### Implementation Phase 1
- GOAL-001: Credenciales, plan e ingesta en identidad/entregas.
| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Implementar claves/capabilities en serverless/src/identity e ingesta en releases con pruebas de aislamiento/replay/expiry | Sí | 2026-11-19 |
| TASK-002 | Implementar CLI JSON HTTPS sin imprimir secretos y comando operativo para plan | Sí | 2026-11-19 |
### Implementation Phase 2
- GOAL-002: Proyeccion publica independiente y consola.
| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-003 | Crear servicio publications privado/publico, tablas separadas, permisos minimos y tests | Sí | 2026-11-19 |
| TASK-004 | Crear consola Angular /integrations y dashboard SSR /p/:slug con tests | Sí | 2026-11-19 |
| TASK-005 | Actualizar deploy/status/CloudFront/config/CI para publications e ingesta | Sí | 2026-11-19 |
### Implementation Phase 3
- GOAL-003: Validar y promover.
| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-006 | Ejecutar tests/build/package/cfn-lint, revisión independiente y smoke vivo completo | Sí: validación local y 17 comprobaciones desplegadas correctas en cada uno de los tres entornos | 2026-11-19 |
| TASK-007 | Integrar development, probar, promover testing y probar, promover main y probar | Sí: cadena de promoción, seis stacks y QA/canary comprobados en cada entorno | 2026-11-19 |
| TASK-008 | Registrar evidencia y continuación remota con pendientes reales | Sí: informe por entorno, runner versionado y continuación remota documentados | 2026-11-19 |
## 3. Alternatives
- ALT-001: IAM/STS queda como adaptacion futura; exigir AWS al cliente limita producto externo.
- ALT-002: OAuth client_credentials agrega servidor/token y gestion de secretos; claves de alcance unico bastan para primer incremento.
## 4. Dependencies
- DEP-001: Cognito JWT existente, DynamoDB transacciones y API de evidencia.
- DEP-002: Angular 22/NgRx y Node.js 24 existentes.
## 5. Files
- FILE-001: serverless/src/identity, releases, publications; services/templates y scripts.
- FILE-002: web/src/app/features/integrations y public-project; docs y CI.
## 6. Testing
- TEST-001: Pruebas de negocio y HTTP con SDK real, publicacion segura y fallos cerrados.
- TEST-002: CLI/UI/SSR y canary sintetico en cada entorno.

Validación local completa: **135 pruebas Node sin omisiones, 20 pruebas Angular, build SSR, paquetes Lambda y cfn-lint de cinco plantillas correctos**. El runner versionado `serverless/scripts/verify-production.mjs` exige main limpio e igual a origin/main, aprobación explícita, recursos de producción recién consultados y fuentes iguales a HEAD; registra hashes y ejecuta QA antes del canary sin habilitar restore.

Development, testing y producción pasaron cada uno **17 comprobaciones integradas**, QA de escritorio/móvil sin errores y el recorrido de clave Plus → CLI → aprobación humana → publicación → lectura pública → despublicación → revocación. Cada entorno limpió 4 usuarios, 15 filas de acceso, 28 de entregas, 7 administrativas y 1 pública, sin fallos, con lecturas posteriores cero.

La cadena quedó integrada mediante [PR #340](https://github.com/LynxPardelle/logs-of-change/pull/340) y [PR #341](https://github.com/LynxPardelle/logs-of-change/pull/341) hacia development, [PR #342](https://github.com/LynxPardelle/logs-of-change/pull/342) hacia testing y [PR #343](https://github.com/LynxPardelle/logs-of-change/pull/343) hacia main, siempre por merge commit. La [CI de main 5b30c86](https://github.com/LynxPardelle/logs-of-change/actions/runs/44641204991) pasó. Producción cerró con el runner all en código 0, smoke del `2026-11-20T00:01:27.981Z` al `2026-11-20T00:03:20.995Z` y lecturas posteriores cero a las `2026-11-20T00:03:35.677Z`. El [informe de producción](../docs/operations/production-logsofchange.md) registra cada entorno y el artefacto publicado de 56 archivos, inventario SHA-256 `ccd3626f2f98db259ab8610ce5c7405a84bc8dd0444ef09fd386223666063009`.
## 7. Risks & Assumptions
- RISK-001: Una publicacion es visible sin login; exigir accion explicita y allowlist.
- ASSUMPTION-001: La plataforma asigna Plus y acceso inicial; no hay suscripcion cobrada ni alta publica.

El cierre acredita este incremento y sus canaries sintéticos. Un piloto con datos/personas reales, la importación y conciliación, el selector reversible, los adjuntos y el billing conservan sus alcances y pendientes separados; no se dan por completados al cerrar este plan.
## 8. Related Specifications / Further Reading
- [Diseño](../docs/superpowers/specs/2026-11-19-integrations-public-design.md)
- [Contrato de integraciones y consultas públicas](../docs/architecture/contracts/integrations-public-v1.md)
- [Contrato de aprobaciones](../docs/architecture/contracts/releases-v1.md)
- [Producción y rollout](../docs/operations/production-logsofchange.md)
