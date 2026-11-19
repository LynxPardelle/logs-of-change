# Logs of Change

Revisión de entregas y aprobaciones con evidencia. Una agencia presenta un hito de software; una persona del cliente acepta su revisión exacta o pide cambios. El historial conserva contenido, actor, fecha y digest de cada revisión decidida.

El nombre conserva la referencia personal a **Wind of Change**, de Scorpions. El guiño editorial es «Que cada cambio encuentre su rumbo», con textos propios sobre cambios, versiones y nuevos caminos. El identificador técnico de paquetes, servicios y recursos es `logsofchange`.

La base de aprobaciones está publicada y verificada en desarrollo, pruebas y producción, con recursos propios bajo lynxpardelle.com. El incremento de integraciones portables y consultas públicas está implementado; su disponibilidad desplegada por entorno se registra por separado en el [informe de producción y rollout](docs/operations/production-logsofchange.md). No se considera publicado por existir su código.

## Arquitectura

Angular 22 con NgRx SignalStore y SSR en Lambda Node.js 24 ARM64, detrás de CloudFront con OAC. APIs independientes de identidad, entregas, evidencia y publicaciones usan API Gateway y Lambdas propias. Cognito autentica personas; DynamoDB aísla datos por organización y proyecto. El acta consulta la API de entregas y no comparte su tabla. La lectura pública usa una Lambda con acceso exclusivo a una tabla de proyecciones públicas, sin permisos sobre entregas, identidad o administración de publicaciones.

| Entorno | Rama de promoción | Dirección | Estado |
| --- | --- | --- | --- |
| Desarrollo | development | https://dev.logsofchange.lynxpardelle.com | Publicado y verificado |
| Pruebas | testing | https://test.logsofchange.lynxpardelle.com | Publicado y verificado |
| Producción | main | https://logsofchange.lynxpardelle.com | Base publicada y verificada |

La base llegó a testing por el [PR #337](https://github.com/LynxPardelle/logs-of-change/pull/337) y a main por el [PR #339](https://github.com/LynxPardelle/logs-of-change/pull/339), con merge commit, CI y flujo completo de aprobación verificados. El trabajo nuevo sigue **development → testing → main**; el incremento se prepara primero en su rama de trabajo y se promueve después de las comprobaciones de cada entorno. Para continuar desde otra máquina o sesión, consultar [REMOTE_HANDOFF.md](REMOTE_HANDOFF.md).

## Enviar entregas desde otro proyecto

El incremento incorpora una API HTTPS y un CLI portable, sin requerir cuenta AWS al proyecto consumidor. Un administrador con Plus activo crea una clave en `/integrations`; el secreto se muestra una sola vez, vence como máximo en 90 días y puede revocarse. La clave sólo crea **borradores privados**: una persona presenta la entrega y otra decide. Las aprobaciones y publicaciones requieren acceso personal vigente.

La distribución del frontend incluye `/downloads/logsofchange.mjs`. Después de publicar el incremento en el entorno elegido, descargar ese archivo y ejecutarlo con Node.js 24; no requiere dependencias ni instalación global. El proyecto consumidor entrega su secreto al proceso mediante `LOGSOFCHANGE_API_KEY`, desde su gestor de secretos:

```sh
node logsofchange.mjs --environment=production --org=mi-agencia --project=portal --file=release.json --idempotency-key=build-42
```

El JSON admite `title`, `summary`, `changes` y procedencia textual opcional `source`. La API equivalente es `POST /api/v1/ingestions/orgs/ORG/projects/PROJECT/releases`, con `X-Logsofchange-Key` e `Idempotency-Key`. El CLI mantiene HTTPS, no sigue redirecciones y no imprime el cuerpo de errores remotos. Ante un timeout, repetir contenido y clave de idempotencia sin cambiar de credencial. [Uso del CLI](cli/README.md) · [Contrato de integración y publicación](docs/architecture/contracts/integrations-public-v1.md).

## Consultas y dashboards públicos

El administrador selecciona una revisión aceptada, un nombre y slug públicos y los campos que quiere publicar: título obligatorio, resumen y cambios opcionales. El servidor comprueba el acta y copia únicamente esa selección. `/p/SLUG` muestra el dashboard; `GET /api/v1/public/projects/SLUG` permite consultarlo desde otro proyecto sin token, con CORS público sin credenciales y paginación de hasta 50 publicaciones. Los contadores describen las publicaciones consultadas, sin inferir el inventario privado.

El DTO público excluye identidades, motivos de decisión, IDs privados, recibos y actas completas. El slug queda reservado para el proyecto. Despublicar elimina la proyección para futuras lecturas; no borra copias que otras personas hayan guardado. El plan Free conserva las aprobaciones manuales; Plus habilita integraciones y publicación. La plataforma asigna el plan administrativamente: este incremento no implementa pagos ni afirma una suscripción cobrada.

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
# Tras la promoción testing → main y revisión explícita de producción:
node serverless/scripts/deploy.mjs --environment=production --approve-production=true
```

El script publica artefactos privados, despliega identidad → entregas → evidencia → publicaciones → frontend y configura certificado DNS y registros propios en `lynxpardelle.com`, en us-east-1. El incremento usa seis stacks por entorno, incluido el de artefactos. Cada despliegue exige su rama: `development` para desarrollo, `testing` para pruebas y `main` con `--approve-production=true` para producción. No modifica registros de otros proyectos. [Operación, planes y reversión](docs/operations/runbook.md).

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
- [Contrato de integraciones y consultas públicas](docs/architecture/contracts/integrations-public-v1.md)
- [Producción y estado del incremento](docs/operations/production-logsofchange.md)
- [Plan y pendientes verificables](plan/architecture-serverless-product-1.md)
- [Migración offline](serverless/scripts/migration/README.md)
- [Frontend](web/README.md)

## Backend heredado

`src/` conserva NestJS/Fastify y los contratos de changelog del origen. MongoDB y los DAO de archivos se mantienen como fuentes de migración, sin mezclar sus credenciales con la API nueva. Sus incompatibilidades preexistentes de dependencias están documentadas en arquitectura. Docker usa ahora los nombres `logsofchange-dev` y `logsofchange-production`; el producto nuevo no depende de esos contenedores.
