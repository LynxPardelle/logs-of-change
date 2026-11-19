# Continuación remota de Logs of Change

## Punto de trabajo

- Repositorio: https://github.com/LynxPardelle/logs-of-change
- Rama de continuación: `architecture/serverless-product-foundation`.
- Producto: **Logs of Change**. HitoClaro fue el nombre provisional; sólo permanece en identificadores físicos AWS y evidencia histórica.
- Integración: primero revisar contra **development**, después promover a **testing** y finalmente a **main**. No integrar esta rama de arquitectura directamente a main.
- CI: workflow `Logs of Change validation`, archivo `.github/workflows/logs-of-change-validation.yml`. Comprobar la ejecución asociada al HEAD remoto; no basta con una ejecución verde de un commit anterior.

El árbol incluye Angular SSR, microservicios SAM de identidad/entregas/evidencia, migración offline, pruebas y herramientas operativas. El backend NestJS de `src/` conserva su contrato e incompatibilidades documentadas; no necesita instalarse para trabajar en el producto serverless.

## Obtener la rama

En un checkout nuevo:

```sh
git clone https://github.com/LynxPardelle/logs-of-change.git
cd logs-of-change
git switch --track origin/architecture/serverless-product-foundation
git status --short --branch
```

En un checkout existente, revisar primero el estado local y conservar cualquier trabajo antes de actualizar. Usar fetch y avance rápido; no reset ni push forzado.

```sh
git fetch origin
git switch architecture/serverless-product-foundation
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

Dirección técnica conservada: https://dev.hitoclaro.lynxpardelle.com

Región us-east-1. Stacks físicos: `hitoclaro-development-identity`, `-releases`, `-evidence`, `-edge` y `-artifacts`. No sustituir el prefijo mediante un reemplazo de marca.

Con AWS CLI ya autenticado, el siguiente comando sólo lee CloudFormation y recupera parámetros públicos; no crea ni actualiza recursos:

```sh
node serverless/scripts/environment-status.mjs --environment=development
node serverless/scripts/environment-status.mjs --environment=development --write-outputs
```

La segunda variante escribe únicamente `serverless/.deployment/development/outputs.json` local e ignorado. No necesita copiar `.env`, tokens o credenciales del otro equipo. Los outputs de Cognito y los dominios son configuración pública.

`serverless/.build/`, `.deployment/`, `.venv/`, node_modules, dist y las capturas no se publican en Git. Los scripts permiten regenerarlos. El [informe histórico](docs/operations/verification-2026-11-19.md) conserva el resumen de la primera comprobación desplegada; las comprobaciones actuales de CI se consultan en GitHub.

## Comprobaciones desplegadas y publicación

El smoke usa identidades y datos sintéticos propios, con mensajes de creación suprimidos, y los limpia al terminar. Es una prueba que escribe exclusivamente en el ámbito sintético; no equivale a la aceptación de un piloto real. Requiere un Chrome/Edge instalado; en Linux se puede indicar `LOGS_OF_CHANGE_BROWSER_PATH`.

```sh
node serverless/scripts/smoke.mjs --environment=development
node serverless/scripts/qa-web.mjs https://dev.hitoclaro.lynxpardelle.com
```

`--restore=true` añade recuperación en una tabla nueva temporal y posterior limpieza. Las contraseñas y tokens del smoke sólo viven en memoria. No abrir `.env`, credenciales, notas de reuniones ni vaults para preparar este repositorio.

Publicar requiere build, empaquetado, pruebas y revisión de CI. Cada servicio puede actualizarse por separado con `deploy.mjs --service=...`; la actualización completa usa `--environment=development`. Testing exige la rama testing; producción exige main y autorización explícita. La rama actual no cambia las ramas de elevación automáticamente.

## Siguiente flujo del plan

TASK-005: seleccionar organización/proyecto y una exportación autorizada de origen, normalizar, cargar en un entorno aislado y conciliar. TASK-006: selector reversible de lectura y paridad. TASK-008 sigue parcial por cargas de adjuntos S3 verificadas; TASK-009 requiere autoridad y aprobación de corte del piloto real. No inventar aprobaciones al importar historia.

[Plan actualizado](plan/architecture-serverless-product-1.md) · [Arquitectura](docs/architecture/ARCHITECTURE.md) · [Contrato v1](docs/architecture/contracts/releases-v1.md) · [Runbook](docs/operations/runbook.md) · [Identidad y continuidad](docs/architecture/adr/0003-logs-of-change-identidad.md).
