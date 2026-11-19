---
goal: Integraciones portables y dashboards publicos de Logs of Change
version: 1
date_created: 2026-11-19
last_updated: 2026-11-19
owner: Logs of Change
status: 'In progress'
tags: [feature, integrations, publications, security]
---
# Introduction
![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)
Implementar el diseno autorizado para clientes externos y elevar solo despues de validacion.
## 1. Requirements & Constraints
- REQ-001: API y CLI portables, borradores privados, aprobacion humana, publicacion explicita.
- SEC-001: Claves256bits hasheadas, caducidad/revocacion, aislamiento y autorizacion transaccional.
- CON-001: Plus asignado por plataforma, sin billing simulado; conservar flujo de promocion.
## 2. Implementation Steps
### Implementation Phase 1
- GOAL-001: Credenciales, plan e ingesta en identidad/entregas.
| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Implementar claves/capabilities en serverless/src/identity e ingesta en releases con pruebas de aislamiento/replay/expiry | No | |
| TASK-002 | Implementar CLI JSON HTTPS sin imprimir secretos y comando operativo para plan | No | |
### Implementation Phase 2
- GOAL-002: Proyeccion publica independiente y consola.
| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-003 | Crear servicio publications privado/publico, tablas separadas, permisos minimos y tests | No | |
| TASK-004 | Crear consola Angular /integrations y dashboard SSR /p/:slug con tests | No | |
| TASK-005 | Actualizar deploy/status/CloudFront/config/CI para publications e ingesta | No | |
### Implementation Phase 3
- GOAL-003: Validar y promover.
| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-006 | Ejecutar tests/build/package/cfn-lint, revision independiente y smoke vivo completo | No | |
| TASK-007 | Integrar development, probar, promover testing y probar, promover main y probar | No | |
| TASK-008 | Registrar evidencia y continuacion remota con pendientes reales | No | |
## 3. Alternatives
- ALT-001: IAM/STS queda como adaptacion futura; exigir AWS al cliente limita producto externo.
- ALT-002: OAuth client_credentials agrega servidor/token y gestion de secretos; claves de alcance unico bastan para primer incremento.
## 4. Dependencies
- DEP-001: Cognito JWT existente, DynamoDB transacciones y API de evidencia.
- DEP-002: Angular22/NgRx y Node24 existentes.
## 5. Files
- FILE-001: serverless/src/identity, releases, publications; services/templates y scripts.
- FILE-002: web/src/app/features/integrations y public-project; docs y CI.
## 6. Testing
- TEST-001: Pruebas de negocio y HTTP con SDK real, publicacion segura y fallos cerrados.
- TEST-002: CLI/UI/SSR y canary sintetico en cada entorno.
## 7. Risks & Assumptions
- RISK-001: Una publicacion es visible sin login; exigir accion explicita y allowlist.
- ASSUMPTION-001: La plataforma asigna Plus y acceso inicial; no hay suscripcion cobrada ni alta publica.
## 8. Related Specifications / Further Reading
- [Diseno](../docs/superpowers/specs/2026-11-19-integrations-public-design.md)
- [Contrato actual](../docs/architecture/contracts/releases-v1.md)
