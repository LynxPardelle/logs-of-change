# Continuación remota de Logs of Change

## Punto de trabajo

- Repositorio: https://github.com/LynxPardelle/logs-of-change
- Rama de continuación: `development`.
- Producto: **Logs of Change**. El identificador técnico de todos los componentes activos es logsofchange.
- Base publicada: development, testing y producción. La base llegó a main por el [PR #339](https://github.com/LynxPardelle/logs-of-change/pull/339), commit `a569e4ee086182a1060f93459b99c3f3d1117f38`, con [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44632948782) y aprobación completa verificada en https://logsofchange.lynxpardelle.com.
- Incremento publicado y verificado en los tres entornos: CLI/API para proyectos externos, claves Plus y publicaciones públicas. Llegó a producción por el [PR #343](https://github.com/LynxPardelle/logs-of-change/pull/343), revisión de aplicación `5b30c8633bd2e1311f266206e300b1a5032acbc6`, con [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44641204991), QA de escritorio/móvil y 17 comprobaciones desplegadas correctas. Las revisiones y resultados están en [producción y rollout](docs/operations/production-logsofchange.md). Las actualizaciones documentales posteriores no cambian el bundle desplegado.
- Checkout de cierre: `main`, para operar producción; el trabajo nuevo continúa en `development`.
- Continuación: el trabajo nuevo y las correcciones se preparan primero para development. La cadena sigue **development → testing → main**, mediante pull request y merge commit, con verificación desplegada antes de cada promoción. Conservar las ramas y cambios locales que se encuentren al retomar.
- CI: workflow `Logs of Change validation`, archivo `.github/workflows/logsofchange-validation.yml`. Comprobar la ejecución asociada al HEAD remoto; no basta con una ejecución verde de un commit anterior.
- Piloto actual: [ZooBeriah Systems](docs/operations/pilot-zooberiah-systems.md), con JSON de una entrega pública real y 17 comprobaciones técnicas correctas en cada entorno de desarrollo/pruebas. Las cuentas productivas nativas y el proyecto están preparados; la decisión personal y publicación del piloto se registran separadamente y siguen pendientes. No reutilizar decisiones sintéticas ni reenviar invitaciones automáticamente.

El árbol incluye Angular SSR, microservicios SAM de identidad/entregas/evidencia/publicaciones, CLI sin dependencias, migración offline, pruebas y herramientas operativas. El backend NestJS de `src/` conserva su contrato e incompatibilidades documentadas; no necesita instalarse para trabajar en el producto serverless.

## Obtener la rama

En un checkout nuevo:

```sh
git clone https://github.com/LynxPardelle/logs-of-change.git
cd logs-of-change
git switch --track origin/development
git status --short --branch
```

En un checkout existente, revisar primero el estado local y conservar cualquier trabajo antes de actualizar. Usar fetch y avance rápido; no reset ni push forzado.

```sh
git fetch origin
git switch development
git pull --ff-only
git status --short --branch
```

## Validación reproducible sin AWS

Usar Node.js 24.15 o superior dentro de la versión 24 y npm. Las dependencias tienen lockfiles independientes:

```sh
npm ci --prefix serverless
npm ci --prefix web
npm --prefix web test -- --watch=false
npm --prefix web run build
node serverless/scripts/package-backend.mjs
node serverless/scripts/package-web.mjs
node --test serverless/test/*.test.mjs
```

El empaquetado debe preceder a los tests de Lambda: sin artefacto, esos tests se omiten. Los scripts validan las rutas generadas antes de eliminar su staging. El backend excluye paquetes de desarrollo y `.bin`; el frontend contiene el bundle SSR/browser y su adaptador.

CI añade `cfn-lint==1.60.1` en Python y valida:

```sh
cfn-lint -r us-east-1 -t serverless/template.yaml serverless/services/identity/template.yaml serverless/services/releases/template.yaml serverless/services/evidence/template.yaml serverless/services/publications/template.yaml
```

En local puede usarse un virtualenv bajo `serverless/.venv/`, ignorado en Git. En Windows con una CA instalada en el sistema, `node --use-system-ca ...` o `NODE_OPTIONS=--use-system-ca` permite usarla manteniendo TLS verificado.

## Inspeccionar el entorno existente sin redesplegar

| Entorno publicado | Dirección | Informe |
| --- | --- | --- |
| Desarrollo | https://dev.logsofchange.lynxpardelle.com | [Desarrollo](docs/operations/development-logsofchange.md) |
| Pruebas | https://test.logsofchange.lynxpardelle.com | [Testing](docs/operations/testing-logsofchange.md) |
| Producción | https://logsofchange.lynxpardelle.com | [Producción y rollout](docs/operations/production-logsofchange.md) |

Los tres entornos tienen seis stacks propios: `logsofchange-<entorno>-identity`, `-releases`, `-evidence`, `-publications`, `-edge` y `-artifacts`, en us-east-1. Usuarios, claves y tablas son independientes entre entornos. El descubrimiento exige los outputs propios de publications junto con los demás servicios; si un servicio no está completo, falla sin crearlo ni usar recursos de otro entorno. El registro de rollout identifica las revisiones verificadas.

Con AWS CLI ya autenticado, el siguiente comando sólo lee CloudFormation y recupera parámetros públicos; no crea ni actualiza recursos:

```sh
node serverless/scripts/environment-status.mjs --environment=development
node serverless/scripts/environment-status.mjs --environment=development --write-outputs
node serverless/scripts/environment-status.mjs --environment=testing
node serverless/scripts/environment-status.mjs --environment=testing --write-outputs
node serverless/scripts/environment-status.mjs --environment=production
node serverless/scripts/environment-status.mjs --environment=production --write-outputs
```

La variante `--write-outputs` escribe únicamente `serverless/.deployment/<entorno>/outputs.json` local e ignorado. No necesita copiar `.env`, tokens o credenciales del otro equipo. Los outputs de Cognito y los dominios son configuración pública.

`serverless/.build/`, `.deployment/`, `.venv/`, node_modules, dist y las capturas no se publican en Git. Los scripts permiten regenerarlos. El [informe histórico](docs/operations/verification-2026-11-19.md) conserva el resumen de la primera comprobación desplegada; las comprobaciones actuales de CI se consultan en GitHub.

## Comprobaciones desplegadas y publicación

El smoke usa identidades y datos sintéticos propios, con mensajes de creación suprimidos, y los limpia al terminar. Es una prueba que escribe exclusivamente en el ámbito sintético; no equivale a la aceptación de un piloto real. Requiere un Chrome/Edge instalado; en Linux se puede indicar `LOGSOFCHANGE_BROWSER_PATH`.

Los comandos siguientes deben ejecutarse contra una revisión coherente de frontend y servicios; comprobar el informe de publicación y el estado de los stacks.

```sh
node serverless/scripts/smoke.mjs --environment=development
node serverless/scripts/qa-web.mjs https://dev.logsofchange.lynxpardelle.com
# Pruebas: usar los outputs de testing, sin reutilizar los de development.
node serverless/scripts/smoke.mjs --environment=testing
node serverless/scripts/qa-web.mjs https://test.logsofchange.lynxpardelle.com
```

El QA acepta únicamente los dominios canónicos de development/testing y guarda sus informes/capturas en `.deployment/<entorno>/browser-qa`. El smoke comprueba dominio y tablas del entorno solicitado. `--restore=true` añade recuperación en una tabla nueva temporal y posterior limpieza únicamente en development; testing lo rechaza. Las contraseñas y tokens del smoke sólo viven en memoria. No abrir `.env`, credenciales, notas de reuniones ni vaults para preparar este repositorio.

El smoke incluye un canary de producto en su tenant UUID: alta de clave sintética, CLI real con secreto sólo en memoria, aprobación humana, publicación y lectura anónima, despublicación y revocación. Pasaron las 17 comprobaciones en development, testing y producción. El cierre de producción confirmó cero usuarios y cero filas en sus cuatro tablas después de limpiar el ámbito sintético, sin fallos. Consultar el informe para los tiempos, conteos y alcance exactos; no representa un piloto real. Los comandos genéricos de smoke/QA mantienen su restricción a development/testing. La verificación inicial de la base de producción utilizó un harness operativo local; el incremento se verificó con el runner versionado siguiente, sin quitar las guardas de los scripts.

El incremento incluye un runner de producción versionado y reproducible desde main limpio e igual a origin/main:

```sh
node --use-system-ca serverless/scripts/verify-production.mjs --approve-production=true --mode=all
```

Comprueba fuentes de HEAD, cuenta, seis stacks, cuatro tablas y Cognito antes de generar copias locales auditadas. Repite las guardas en cada copia, prohíbe restore y ejecuta QA antes del smoke; si falla el sitio no crea usuarios sintéticos. Los modos qa/smoke permiten comprobaciones separadas con la misma aprobación explícita.

Publicar requiere árbol limpio, build y empaquetado del commit que se va a desplegar, pruebas y CI correcta para ese HEAD. Cada servicio puede actualizarse por separado con `deploy.mjs --service=...`. Después de promover por PR, obtener testing con avance rápido y publicar su entorno:

```sh
git fetch origin
git switch testing
git pull --ff-only
git status --short --branch
node serverless/scripts/deploy.mjs --environment=testing
```

Conservar cualquier trabajo local antes del cambio de rama. El script exige development para `--environment=development` y testing para `--environment=testing`; producción exige main y `--approve-production=true` tras revisión explícita. No cambia ramas automáticamente. Si aparece una corrección en pruebas, prepararla en development y repetir la promoción; no alterar main para resolverla.

## Integraciones, consultas públicas y planes

La consola `/integrations` está disponible en los tres entornos y permite al administrador gestionar claves y seleccionar revisiones aceptadas y campos para publicar. El [CLI de producción](https://logsofchange.lynxpardelle.com/downloads/logsofchange.mjs), distribuido en `/downloads/logsofchange.mjs`, usa Node.js 24 y lee únicamente `LOGSOFCHANGE_API_KEY` del entorno del proceso. `--environment=development|testing|production` elige el origen canónico, sin URL alternativa ni redirects. Usar IDs de organización/proyecto verificados e Idempotency-Key estable. La clave crea borradores privados y no puede leer, presentar, decidir o publicar.

`/p/SLUG` y `GET /api/v1/public/projects/SLUG` muestran sólo la proyección publicada explícitamente. La API pública permite CORS sin credenciales; las rutas privadas y de ingesta no habilitan CORS general. El slug permanece reservado después de retirar la última publicación. Un administrador vigente puede despublicar o revocar claves aunque Plus esté vencido o las escrituras estén congeladas.

Free conserva las aprobaciones manuales. Plus se controla mediante la fila de plataforma `TENANT#org / PRODUCT` de AccessTable; no se asigna con JWT de cliente ni se cobran pagos en este incremento. `serverless/scripts/set-product-plan.mjs` usa la sesión AWS de plataforma, muestra un preview por defecto y sólo escribe con `--apply=true`, validando proyecto activo y CAS. La producción requiere main y `--approve-production=true`, incluso para el preview. El plan corresponde a la organización; el argumento project verifica un proyecto activo y no limita Plus a ese único proyecto. [Contrato](docs/architecture/contracts/integrations-public-v1.md) · [Operación de planes](docs/operations/runbook.md).

## Siguiente flujo del plan

La base de aprobaciones y la adición de integraciones y dashboards están publicadas y verificadas en producción; sus promociones y evidencias constan en el registro de rollout. La revisión operativa de un piloto real permanece separada. TASK-005 requiere seleccionar organización/proyecto y una exportación autorizada, normalizar, cargar en un entorno aislado y conciliar. TASK-006: selector reversible de lectura y paridad. TASK-008 sigue parcial por cargas de adjuntos S3 verificadas; TASK-009 requiere autoridad y aprobación de corte del piloto real. No inventar aprobaciones al importar historia.

[Plan actualizado](plan/architecture-serverless-product-1.md) · [Arquitectura](docs/architecture/ARCHITECTURE.md) · [Contrato v1](docs/architecture/contracts/releases-v1.md) · [Runbook](docs/operations/runbook.md) · [Identidad y continuidad](docs/architecture/adr/0003-logs-of-change-identidad.md).
