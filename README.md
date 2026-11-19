# Logs of Change

Revisión de entregas y aprobaciones con evidencia. Una agencia presenta un hito de software; una persona del cliente acepta su revisión exacta o pide cambios. El historial conserva contenido, actor, fecha y digest de cada revisión decidida.

El nombre conserva la referencia personal a **Wind of Change**, de Scorpions. El guiño editorial es «Que cada cambio encuentre su rumbo», con textos propios sobre cambios, versiones y nuevos caminos. El identificador técnico de paquetes, servicios y recursos es `logsofchange`.

El entorno de desarrollo utiliza nombres definitivos logsofchange y un dominio propio bajo lynxpardelle.com. La publicación crea recursos nuevos, verifica el flujo y retira el entorno vacío anterior. [Decisión de publicación](docs/architecture/adr/0004-logsofchange-development.md).

## Arquitectura

Angular 22 con NgRx SignalStore y SSR en Lambda Node.js 24 ARM64, detrás de CloudFront con OAC. APIs independientes de identidad, entregas y evidencia usan API Gateway y Lambdas propias. Cognito autentica personas; DynamoDB aísla datos por organización y proyecto. Cada microservicio tiene su propio stack SAM y ciclo de despliegue. El acta consulta la API de entregas y no comparte su tabla.

| Entorno | Rama de promoción | Dirección |
| --- | --- | --- |
| Desarrollo | development | https://dev.logsofchange.lynxpardelle.com |
| Pruebas | testing | https://test.logsofchange.lynxpardelle.com |
| Producción | main | https://logsofchange.lynxpardelle.com |

Desarrollo se publica desde la rama development; pruebas y producción son configuración prevista y no se elevan en esta entrega. Los resultados anteriores constan en [verificación histórica](docs/operations/verification-2026-11-19.md). Promoción: **development → testing → main**. Para continuar desde otra máquina o sesión, consultar [REMOTE_HANDOFF.md](REMOTE_HANDOFF.md).

## Arranque y comprobaciones

Node.js 24.15 o superior dentro de Node.js 24. Las dependencias de `web/` y `serverless/` tienen lockfiles propios; no requieren instalar el backend heredado.

```sh
npm ci --prefix serverless
npm ci --prefix web
npm --prefix web test -- --watch=false
npm --prefix web run build
node serverless/scripts/package-backend.mjs
node serverless/scripts/package-web.mjs
node --test serverless/test/*.test.mjs
```

Para comprobar solamente salud local: `node serverless/scripts/serve-health.mjs`; en otra terminal, `npm --prefix web start`. El acceso y los datos de negocio necesitan un entorno configurado con Cognito: la aplicación no fabrica sesiones ni entregas de demostración.

## Publicación

Después de pruebas y empaquetado, con AWS CLI ya autenticado y permisos sobre los recursos propios del producto:

```sh
node serverless/scripts/deploy.mjs --environment=development
# Actualizar sólo un servicio, conservando los demás stacks:
node serverless/scripts/deploy.mjs --environment=development --service=releases
```

El script publica artefactos privados, despliega identidad → entregas → evidencia → frontend y configura certificado DNS y registros propios en `lynxpardelle.com`, en us-east-1. Testing exige la rama `testing`; producción exige `main` y revisión explícita. No modifica registros de otros proyectos. [Operación y reversión](docs/operations/runbook.md).

## Alcance funcional y piloto

Implementados en código: autenticación Code+PKCE, descubrimiento de proyectos con acceso, borradores, presentación, decisión independiente, solicitud de cambios y nueva revisión, historial, recibos idempotentes y acta JSON verificable. Los adjuntos no vacíos siguen deshabilitados hasta verificar bytes, versiones y hashes en S3; nunca se aceptan referencias sin verificar. El acta demuestra integridad de aplicación; no se presenta como firma legal.

La migración offline admite únicamente un JSON explícito, elimina campos sensibles y produce procedencia, hashes y diagnósticos. No carga una fuente real ni crea aprobaciones históricas. El piloto requiere organización, permisos, conciliación, restauración y corte propios antes de activar una migración real.

- [Producto y criterios de aceptación](docs/product/aprobacion-entregas.md)
- [Arquitectura y separación de servicios](docs/architecture/ARCHITECTURE.md)
- [Identidad de Logs of Change y continuidad AWS](docs/architecture/adr/0003-logs-of-change-identidad.md)
- [Contrato API v1](docs/architecture/contracts/releases-v1.md)
- [Plan y pendientes verificables](plan/architecture-serverless-product-1.md)
- [Migración offline](serverless/scripts/migration/README.md)
- [Frontend](web/README.md)

## Backend heredado

`src/` conserva NestJS/Fastify y los contratos de changelog del origen. MongoDB y los DAO de archivos se mantienen como fuentes de migración, sin mezclar sus credenciales con la API nueva. Sus incompatibilidades preexistentes de dependencias están documentadas en arquitectura. Docker usa ahora los nombres `logsofchange-dev` y `logsofchange-production`; el producto nuevo no depende de esos contenedores.
