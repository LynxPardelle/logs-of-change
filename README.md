# Logs of Change

Revisión de entregas y aprobaciones con evidencia. Una agencia presenta un hito de software; una persona del cliente acepta su revisión exacta o pide cambios. El historial conserva contenido, actor, fecha y digest de cada revisión decidida.

El nombre conserva la referencia personal a **Wind of Change**, de Scorpions. El guiño editorial es «Que cada cambio encuentre su rumbo», con textos propios sobre cambios, versiones y nuevos caminos. El identificador técnico de paquetes, servicios y recursos es `logsofchange`.

Los entornos de desarrollo y pruebas utilizan nombres definitivos logsofchange y dominios propios bajo lynxpardelle.com. Desarrollo se publicó y verificó antes de retirar el entorno vacío anterior; después se promovió a testing mediante pull request y se verificó su despliegue aislado. [Publicación de desarrollo](docs/operations/development-logsofchange.md) · [Publicación de pruebas](docs/operations/testing-logsofchange.md).

## Arquitectura

Angular 22 con NgRx SignalStore y SSR en Lambda Node.js 24 ARM64, detrás de CloudFront con OAC. APIs independientes de identidad, entregas y evidencia usan API Gateway y Lambdas propias. Cognito autentica personas; DynamoDB aísla datos por organización y proyecto. Cada microservicio tiene su propio stack SAM y ciclo de despliegue. El acta consulta la API de entregas y no comparte su tabla.

| Entorno | Rama de promoción | Dirección | Estado |
| --- | --- | --- | --- |
| Desarrollo | development | https://dev.logsofchange.lynxpardelle.com | Publicado y verificado |
| Pruebas | testing | https://test.logsofchange.lynxpardelle.com | Publicado y verificado |
| Producción | main | https://logsofchange.lynxpardelle.com | Pendiente de promoción y despliegue |

Development se promovió a testing por el [PR #337](https://github.com/LynxPardelle/logs-of-change/pull/337), con CI y flujo completo de aprobación verificados en el entorno de pruebas. Main permanece sin cambios y producción sigue pendiente. El trabajo nuevo continúa en development y se eleva mediante **development → testing → main**, usando merge commit. Para continuar desde otra máquina o sesión, consultar [REMOTE_HANDOFF.md](REMOTE_HANDOFF.md).

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
# Tras promover por PR y obtener la rama testing:
node serverless/scripts/deploy.mjs --environment=testing
```

El script publica artefactos privados, despliega identidad → entregas → evidencia → frontend y configura certificado DNS y registros propios en `lynxpardelle.com`, en us-east-1. Cada despliegue exige su rama: `development` para desarrollo y `testing` para pruebas; producción exige `main` y `--approve-production=true` tras revisión explícita. No modifica registros de otros proyectos. [Operación y reversión](docs/operations/runbook.md).

Para repetir la verificación del entorno de pruebas sin redesplegar:

```sh
node serverless/scripts/environment-status.mjs --environment=testing --write-outputs
node serverless/scripts/qa-web.mjs https://test.logsofchange.lynxpardelle.com
node serverless/scripts/smoke.mjs --environment=testing
```

La consulta de estado sólo lee AWS y guarda outputs públicos locales. El QA comprueba escritorio, móvil, salud y login; el smoke escribe usuarios y datos sintéticos de su ámbito y los limpia al terminar. El recorrido probado incluye solicitud de cambios, una nueva revisión, aceptación y descarga de ambas actas conservando la evidencia anterior. No sustituye la aceptación de un piloto real.

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
