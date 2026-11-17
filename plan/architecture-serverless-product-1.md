---
goal: Migrar por etapas Logs of Change a una API de revisión de entregas
version: '1.0'
date_created: 2026-11-17
status: 'In progress'
tags: [architecture, migration, feature]
---

# Introduction

![Estado en curso](https://img.shields.io/badge/status-in_progress-yellow)

El primer paso establece rutas y herramientas de validación locales en la rama `architecture/serverless-product-foundation`. Las fases posteriores definen las condiciones para probar un proyecto piloto.

## 1. Requirements & Constraints

- **REQ-001** La Lambda de salud y la SPA identifican el mismo contrato HTTP.
- **CON-001** Conservar el árbol y los contratos NestJS mientras se verifican los read models.
- **SEC-001** Verificar identidad, pertenencia y permiso de proyecto para operaciones protegidas.
- **REQ-002** Una decisión y su versión son consultables con integridad comprobable.
- **REQ-003** Resolver reintentos y concurrencia sin repetir decisiones.
- **PAT-001** Aislar el tráfico por ruta y proyecto. Mantener un escritor por entidad.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001** Establecer el contrato de salud local y verificar la consola sin credenciales.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-001 | Definir `serverless/template.yaml` y `serverless/src/health/index.mjs`. Validar plantilla con cfn-lint y contrato con `node --test serverless/test/health.test.mjs`. | Sí | 2026-11-17 |
| TASK-002 | Implementar la pantalla inicial con SignalStore en `web/src/app/features/health/`. Confirmar compilación de producción y tests de apertura, fallo, reintento y respuesta de otro servicio. | Sí | 2026-11-17 |
| TASK-003 | Documentar criterios de producto, inventario de contratos y decisión en `docs/product/` y `docs/architecture/`. | Sí | 2026-11-17 |

### Implementation Phase 2

- **GOAL-002** Probar autorización por organización y conciliación de una lectura piloto. Depende de la fase 1.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-004 | Añadir a `serverless/template.yaml` recursos aislados de prueba para Cognito, tabla bajo demanda y bucket privado. Crear una ruta de lectura en `serverless/src/releases/` con pruebas de membresía, rol de proyecto y acceso cruzado. | Pendiente | — |
| TASK-005 | Crear `serverless/scripts/migration/` para exportar de solo lectura, normalizar y producir un informe con conteos, huérfanos y colisiones. Cargar el fixture en entorno aislado y comparar contra la lectura del origen para el proyecto piloto. | Pendiente | — |
| TASK-006 | Publicar contratos versionados de la ruta de lectura en `docs/architecture/contracts/`. Activar solo después de demostrar paridad del proyecto y reversión de la selección de origen. | Pendiente | — |

### Implementation Phase 3

- **GOAL-003** Completar el flujo de aprobación para un proyecto. Depende de la fase 2.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-007 | Implementar presentación y decisión con recibo idempotente, condición de revisión y transacción en `serverless/src/releases/`. Comprobar las carreras de dos revisores y la repetición de una clave con un cuerpo distinto. | Pendiente | — |
| TASK-008 | Implementar UI de entregas y revisiones en `web/src/app/features/releases/`, validación de referencias a versiones de medios y acta exportable. Ejecutar AC-01 a AC-06 del documento de producto. | Pendiente | — |
| TASK-009 | Registrar la autoridad de escritura para el piloto, demostrar recuperación de datos y aprobar el corte por proyecto. Documentar cómo congelar los comandos y conservar decisiones al revertir el acceso. | Pendiente | — |

## 3. Alternatives

- **ALT-001** Conservar NestJS completo en Lambda. Conserva código pero acopla la nueva frontera al arranque y al esquema heredados.
- **ALT-002** Cortar todos los proyectos de una vez. Entrelaza el lanzamiento con la reconciliación de todos los datos existentes.

## 4. Dependencies

- **DEP-001** Node.js 24 y npm. El cliente Angular usa sus propias dependencias y lockfile.
- **DEP-002** AWS SAM y Docker para emular AWS localmente. El contrato del handler también se prueba con Node.js.
- **DEP-003** Proyecto piloto y un mapeo de organización verificado para cualquier operación de migración de datos.

## 5. Files

- **FILE-001** `serverless/template.yaml` contiene los recursos iniciales.
- **FILE-002** `web/` contiene la SPA y sus pruebas.
- **FILE-003** `docs/architecture/ARCHITECTURE.md` documenta contratos, riesgos y reversión.

## 6. Testing

- **TEST-001** Prueba del contrato de salud y lint de la plantilla.
- **TEST-002** Compilación de producción y pruebas de UI para la ruta inicial.
- **TEST-003** Contratos de lectura, aislamiento entre organizaciones, reintentos, carreras y restauración para las rutas de negocio.

## 7. Risks & Assumptions

- **RISK-001** Las claves globales y las relaciones heredadas requieren validación antes de habilitar las rutas nuevas.
- **RISK-002** Conservar un escritor por entidad evita divergencia entre orígenes.
- **ASSUMPTION-001** La primera evidencia pertenece al piloto y la operación se evalúa dentro de un solo proyecto.

## 8. Related Specifications / Further Reading

- [Producto y criterios de aceptación](../docs/product/aprobacion-entregas.md)
- [Arquitectura](../docs/architecture/ARCHITECTURE.md)
- [ADR 0001](../docs/architecture/adr/0001-migracion-incremental.md)
