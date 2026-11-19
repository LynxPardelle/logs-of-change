# Continuación remota de Logs of Change

## Punto de trabajo

- Repositorio: https://github.com/LynxPardelle/logs-of-change
- Rama de continuación: `development`.
- Producto: **Logs of Change**. El identificador técnico de todos los componentes activos es logsofchange.
- Estado: plataforma publicada y verificada en **development y testing**. La promoción a pruebas se realizó por el [PR #337](https://github.com/LynxPardelle/logs-of-change/pull/337), merge `46f9d68f01e35a8412d570988d5e752633c2a85e`, con [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44625225969). Main permanece sin cambios y producción sigue pendiente.
- Continuación: el trabajo nuevo y las correcciones se preparan en development; para operar o desplegar pruebas se obtiene testing después de la promoción. El checkout de cierre de esta entrega es testing. La cadena sigue **development → testing → main**, mediante pull request y merge commit.
- CI: workflow `Logs of Change validation`, archivo `.github/workflows/logsofchange-validation.yml`. Comprobar la ejecución asociada al HEAD remoto; no basta con una ejecución verde de un commit anterior.

El árbol incluye Angular SSR, microservicios SAM de identidad/entregas/evidencia, migración offline, pruebas y herramientas operativas. El backend NestJS de `src/` conserva su contrato e incompatibilidades documentadas; no necesita instalarse para trabajar en el producto serverless.

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

Usar Node.js24.15 o superior dentro de la versión24 y npm. Las dependencias tienen lockfiles independientes:

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
cfn-lint -r us-east-1 -t serverless/template.yaml serverless/services/identity/template.yaml serverless/services/releases/template.yaml serverless/services/evidence/template.yaml
```

En local puede usarse un virtualenv bajo `serverless/.venv/`, ignorado en Git. En Windows con una CA instalada en el sistema, `node --use-system-ca ...` o `NODE_OPTIONS=--use-system-ca` permite usarla manteniendo TLS verificado.

## Inspeccionar el entorno existente sin redesplegar

| Entorno publicado | Dirección | Informe |
| --- | --- | --- |
| Desarrollo | https://dev.logsofchange.lynxpardelle.com | [Desarrollo](docs/operations/development-logsofchange.md) |
| Pruebas | https://test.logsofchange.lynxpardelle.com | [Testing](docs/operations/testing-logsofchange.md) |

Cada entorno tiene cinco stacks propios `logsofchange-<entorno>-identity`, `-releases`, `-evidence`, `-edge` y `-artifacts`, en us-east-1, sin compartir usuarios ni tablas. Los cinco stacks de testing terminaron CREATE_COMPLETE y su flujo completo de aprobación se verificó con datos sintéticos. Main conserva `10bd133eed06833208779e30818d6c55d500280f`; no se desplegó producción.

Con AWS CLI ya autenticado, el siguiente comando sólo lee CloudFormation y recupera parámetros públicos; no crea ni actualiza recursos:

```sh
node serverless/scripts/environment-status.mjs --environment=development
node serverless/scripts/environment-status.mjs --environment=development --write-outputs
node serverless/scripts/environment-status.mjs --environment=testing
node serverless/scripts/environment-status.mjs --environment=testing --write-outputs
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

Publicar requiere árbol limpio, build y empaquetado del commit que se va a desplegar, pruebas y CI correcta para ese HEAD. Cada servicio puede actualizarse por separado con `deploy.mjs --service=...`. Después de promover por PR, obtener testing con avance rápido y publicar su entorno:

```sh
git fetch origin
git switch testing
git pull --ff-only
git status --short --branch
node serverless/scripts/deploy.mjs --environment=testing
```

Conservar cualquier trabajo local antes del cambio de rama. El script exige development para `--environment=development` y testing para `--environment=testing`; producción exige main y `--approve-production=true` tras revisión explícita. No cambia ramas automáticamente. Si aparece una corrección en pruebas, prepararla en development y repetir la promoción; no alterar main para resolverla.

## Siguiente flujo del plan

TASK-014 queda parcial: testing está publicado y verificado; la promoción a main, producción y la revisión operativa del piloto siguen pendientes. TASK-005: seleccionar organización/proyecto y una exportación autorizada de origen, normalizar, cargar en un entorno aislado y conciliar. TASK-006: selector reversible de lectura y paridad. TASK-008 sigue parcial por cargas de adjuntos S3 verificadas; TASK-009 requiere autoridad y aprobación de corte del piloto real. No inventar aprobaciones al importar historia.

[Plan actualizado](plan/architecture-serverless-product-1.md) · [Arquitectura](docs/architecture/ARCHITECTURE.md) · [Contrato v1](docs/architecture/contracts/releases-v1.md) · [Runbook](docs/operations/runbook.md) · [Identidad y continuidad](docs/architecture/adr/0003-logs-of-change-identidad.md).
