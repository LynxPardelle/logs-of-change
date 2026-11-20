# Producción de Logs of Change y rollout de integraciones

Fecha del hito base: 2026-11-19. Sitio: **https://logsofchange.lynxpardelle.com**. Región: us-east-1. Marca: Logs of Change. Identificador técnico: logsofchange.

**Incremento publicado y verificado en los tres entornos.** Su cierre de producción se comprobó el **2026-11-20 a las 00:03:35.677 UTC**, todavía **2026-11-19 en Ciudad de México**. Las fechas de la base y del incremento se conservan separadas.

## Base publicada y verificada

El [PR #339](https://github.com/LynxPardelle/logs-of-change/pull/339) promovió testing a main mediante merge commit **[a569e4e](https://github.com/LynxPardelle/logs-of-change/commit/a569e4ee086182a1060f93459b99c3f3d1117f38)**. La [CI de esa revisión](https://github.com/LynxPardelle/logs-of-change/actions/runs/44632948782) terminó correctamente. Ese commit identifica la publicación inicial de la base y no debe interpretarse como HEAD permanente después de otros incrementos.

Los cinco stacks de la base terminaron en CREATE_COMPLETE:

- logsofchange-production-artifacts
- logsofchange-production-identity
- logsofchange-production-releases
- logsofchange-production-evidence
- logsofchange-production-edge

El sitio publicó Angular SSR mediante Lambda, CloudFront, HTTPS y dominio propio. La revisión de escritorio y móvil pasó con cero errores de consola, página y red. Salud y configuración correspondieron a producción.

El smoke base pasó **12 comprobaciones integradas**, incluyendo el recorrido real de navegador: creación y presentación de entrega, solicitud de cambios, nueva revisión, aceptación y descarga/verificación de ambas actas conservando la evidencia anterior. También comprobó aislamiento, idempotencia, autoaprobación denegada, carrera de revisores, integridad, congelación y revocación.

Se limpiaron **4 usuarios, 7 filas de acceso y 22 filas de entregas**, sin fallos. Las lecturas posteriores al canary, a las **23:11 UTC del 2026-11-19**, confirmaron cero usuarios y cero filas de prueba en las tablas de la base. Las identidades se crearon con mensajes suprimidos y contraseñas/tokens sólo en memoria. La validación no utiliza clientes reales ni equivale a su aceptación.

Los scripts genéricos de QA/smoke conservaban sus restricciones a development/testing. La comprobación base de producción utilizó un harness operativo local ignorado en Git, con aprobación explícita, rama main, cuenta/región/origen, pool/cliente y tablas validados y restore prohibido. Sus copias de los recorridos existentes fijaron hashes de las fuentes y registraron las transformaciones de paths y selección de entorno. No se modificó el bundle publicado para ejecutar esa comprobación.

## Incremento implementado

El incremento se desarrolló en `codex/product-integrations-public` y sigue **development → testing → main** tras las validaciones correspondientes. Su código incorpora:

- CLI portable de Node.js 24, sin dependencias y descargable del bundle en `/downloads/logsofchange.mjs`.
- API de ingesta por HTTPS y clave por proyecto, limitada a crear borradores privados.
- Gestión de claves mediante JWT personal y administrador vigente, secreto de 256 bits mostrado una vez, hash en reposo, caducidad máxima de 90 días y revocación.
- Free para aprobaciones manuales y Plus administrado por plataforma para integraciones/publicación, sin billing ni cobros automáticos.
- Publicación explícita de una revisión aceptada y campos seleccionados, verificación del acta y separación entre AdminTable privada y PublicTable de DTO público.
- Dashboard SSR `/p/SLUG` y API anónima paginada `/api/v1/public/projects/SLUG`, con CORS sin credenciales y sin acceso a tablas privadas.
- Despublicación y revocación disponibles a administradores vigentes aunque Plus esté vencido o el proyecto tenga escrituras congeladas.

La validación completa del incremento pasó **135 pruebas Node sin omisiones, 20 pruebas Angular, build SSR, empaquetado Lambda y cfn-lint de cinco plantillas**. Incluye plan/vigencia/alcance, revocación y replay, carreras, serialización del SDK real, CLI y DTO público exacto. Las 25 pruebas focalizadas de publicaciones forman parte de ese total; el runner de producción añade sus guardas de cuenta, recursos, fuentes y ejecución. La revisión independiente detectó y corrigió una carrera de revocación durante el replay ganador de ingesta, con un test de barrera. Los resultados desplegados se registran por entorno a continuación; las pruebas locales no los sustituyen.

La promoción funcional se integró por el [PR #340](https://github.com/LynxPardelle/logs-of-change/pull/340), revisión [e3e0805](https://github.com/LynxPardelle/logs-of-change/commit/e3e0805e6d8e8b69e0ea8e8330d6b6ddacbfc822), cuya [CI](https://github.com/LynxPardelle/logs-of-change/actions/runs/44637021810) pasó antes de comprobar desarrollo. El [PR #341](https://github.com/LynxPardelle/logs-of-change/pull/341) añadió el runner de producción reproducible, integrado en development como [bd3ee0c](https://github.com/LynxPardelle/logs-of-change/commit/bd3ee0c35277083b1aecedd617f1762b555a2692), con [CI correcta para ese HEAD](https://github.com/LynxPardelle/logs-of-change/actions/runs/44638967440). El [PR #342](https://github.com/LynxPardelle/logs-of-change/pull/342) promovió development a testing y el [PR #343](https://github.com/LynxPardelle/logs-of-change/pull/343) promovió testing a main mediante merge commit. Ninguna promoción omitió los controles del carril.

## Registro del rollout del incremento

| Entorno | Revisión y CI del incremento | Despliegue de seis stacks | Sitio y canary del producto | Limpieza y lectura posterior |
| --- | --- | --- | --- | --- |
| development | Aplicación [e3e0805](https://github.com/LynxPardelle/logs-of-change/commit/e3e0805e6d8e8b69e0ea8e8330d6b6ddacbfc822), PR #340; runner [bd3ee0c](https://github.com/LynxPardelle/logs-of-change/commit/bd3ee0c35277083b1aecedd617f1762b555a2692), [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44638967440), PR #341 | Seis stacks completos | 17 comprobaciones correctas, QA de escritorio/móvil sin errores; consola, previsualización y dashboard inspeccionados | 4 usuarios, 15 filas de acceso, 28 de entregas, 7 administrativas y 1 pública limpiadas; cero fallos y lecturas posteriores cero |
| testing | [a4640a1](https://github.com/LynxPardelle/logs-of-change/commit/a4640a1c83d2906e1b945a6388608b55184eac5c), [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44639316511); PR #342 | Seis stacks completos | 17 comprobaciones correctas, QA desktop/móvil sin errores; consola, preview y dashboard inspeccionados | 4 usuarios, 15 filas de acceso, 28 de entregas, 7 administrativas y 1 pública limpiadas; cero fallos y lecturas posteriores cero |
| production | [5b30c86](https://github.com/LynxPardelle/logs-of-change/commit/5b30c8633bd2e1311f266206e300b1a5032acbc6), [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44641204991); PR #343 | Seis stacks completos | Runner versionado all: 17 comprobaciones correctas, QA de escritorio/móvil sin errores y cinco capturas del producto revisadas sin hallazgos | 4 usuarios, 15 filas de acceso, 28 de entregas, 7 administrativas y 1 pública limpiadas; cero fallos y lecturas posteriores cero a las 00:03:35.677 UTC del 2026-11-20 |

El sexto stack es `logsofchange-<entorno>-publications`; los cinco de la base conservan sus responsabilidades. La tabla de rollout acredita los resultados efectivamente ejecutados para cada promoción. Los commits documentales posteriores no cambian los bundles desplegados y verificados.

El artefacto frontend publicado en producción tiene **56 archivos** y SHA-256 de inventario **`ccd3626f2f98db259ab8610ce5c7405a84bc8dd0444ef09fd386223666063009`**, leído del manifiesto del checkout de publicación. Describe el inventario del bundle, no el ZIP generado por AWS.

## Verificación final del incremento en producción

El runner `verify-production.mjs --approve-production=true --mode=all` terminó con código 0 sobre main `5b30c8633bd2e1311f266206e300b1a5032acbc6`. El smoke comenzó a las `2026-11-20T00:01:27.981Z` y terminó a las `2026-11-20T00:03:20.995Z`, con **17 de 17 comprobaciones correctas**. QA se ejecutó antes de crear identidades sintéticas y comprobó escritorio de 1280 px y móvil de 390 px, cero errores de consola/página/red, salud y configuración HTTP 200 y login Cognito Code+PKCE.

Además de las aprobaciones y actas del flujo base, el canary del producto comprobó creación de clave con Plus, invocación real del CLI con secreto sólo en memoria, borrador privado, flujo de aprobación con identidades sintéticas, publicación de campos seleccionados, consulta pública sin token y dashboard SSR, despublicación y revocación. Las cinco capturas del producto se revisaron sin hallazgos. La descarga del [CLI de producción](https://logsofchange.lynxpardelle.com/downloads/logsofchange.mjs) respondió HTTP 200, no-store y attachment. Después de retirar la publicación, el dashboard respondió 404; la Function URL directa de Lambda respondió 403 con AWS_IAM.

La limpieza del incremento eliminó **4 usuarios, 15 filas de acceso, 28 filas de entregas, 7 filas administrativas de publicaciones y 1 fila pública**, con `failures: []`. Las lecturas posteriores, a las `2026-11-20T00:03:35.677Z`, confirmaron **cero usuarios y Count 0 en AccessTable, ReleasesTable, AdminTable y PublicTable**, sin continuación pendiente. No quedaron identidades, claves, permisos, entregas, reservas de slug ni proyecciones del canary. La limpieza se limitó al ámbito sintético; las lecturas posteriores sólo obtuvieron conteos y no contenido de las filas.

## Repetir consultas y operar

Con AWS CLI ya autenticado mediante una sesión de plataforma y el incremento desplegado, recuperar outputs públicos sin cambiar AWS:

```sh
node serverless/scripts/environment-status.mjs --environment=production
node serverless/scripts/environment-status.mjs --environment=production --write-outputs
```

Este lector espera publications; si falta, se detiene sin crear recursos ni usar el stack de otro entorno. El despliegue de producción exige main y `deploy.mjs --environment=production --approve-production=true`. Los comandos genéricos de smoke/QA no habilitan producción implícitamente.

El incremento dispone de un runner versionado, reproducible desde main limpio e igual a origin/main:

```sh
node --use-system-ca serverless/scripts/verify-production.mjs --approve-production=true --mode=all
```

Valida las fuentes frente a HEAD, la cuenta y namespace de los seis stacks, cuatro tablas, pool/cliente y origen; registra SHA-256 y 11 transformaciones exactas en copias ignoradas. Cada copia vuelve a validar su propio hash y el preflight. QA se ejecuta antes del smoke y un fallo impide crear identidades sintéticas. No habilita restore. Este runner reemplaza el procedimiento local del hito base para las comprobaciones posteriores del incremento.

La asignación de Plus usa `set-product-plan.mjs`: preview por defecto y aplicación sólo con `--apply=true`, validando entorno, cuenta, proyecto activo y CAS. Producción exige main y `--approve-production=true`, también para el preview. El plan pertenece a la organización, sin que las APIs del cliente puedan otorgarlo. [Procedimiento de operación](runbook.md).

Las evidencias regenerables permanecen en la carpeta ignorada `serverless/.deployment/<entorno>/`: outputs públicos, reportes de QA/canary y capturas, sin contraseñas o tokens. Para el incremento, registrar además creación y revocación de clave, ejecución real del CLI, aprobación humana, publicación/consulta pública, despublicación y limpieza de las particiones/claim del mismo tenant UUID. No utilizar scans o eliminaciones de datos ajenos como limpieza de pruebas.

[REMOTE_HANDOFF.md](../../REMOTE_HANDOFF.md) contiene la continuación remota. [Contrato de integraciones y publicación](../architecture/contracts/integrations-public-v1.md) define rutas y DTO. El piloto con usuarios/proyecto reales, la importación y conciliación de un origen real, el selector reversible, los adjuntos y el billing siguen fuera de esta acreditación; no se crean aprobaciones históricas ni identidades de cliente inventadas.

## Piloto nativo posterior

El [piloto real de ZooBeriah Systems](pilot-zooberiah-systems.md) se completó después con cuentas reales, envío CLI/API, aprobación actual, acta oficial verificada y [dashboard público](https://logsofchange.lynxpardelle.com/p/zooberiah-systems). La clave temporal del piloto quedó revocada; su revisión aceptada, cuentas y publicación se conservan. Este informe mantiene la evidencia histórica de los canaries, cuyos conteos cero anteriores no describen el estado global actual: cualquier prueba posterior debe limpiar únicamente su ámbito UUID y preservar los datos reales. El informe propio del piloto registra los tiempos y la diferencia con las tareas de migración pendientes.
