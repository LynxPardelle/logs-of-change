# Producción de Logs of Change y rollout de integraciones

Fecha del hito base: 2026-11-19. Sitio: **https://logsofchange.lynxpardelle.com**. Región: us-east-1. Marca: Logs of Change. Identificador técnico: logsofchange.

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

El incremento se prepara en `codex/product-integrations-public` y sigue **development → testing → main** tras las validaciones correspondientes. Su código incorpora:

- CLI portable de Node.js 24, sin dependencias y descargable del bundle en `/downloads/logsofchange.mjs`.
- API de ingesta por HTTPS y clave por proyecto, limitada a crear borradores privados.
- Gestión de claves mediante JWT personal y administrador vigente, secreto de 256 bits mostrado una vez, hash en reposo, caducidad máxima de 90 días y revocación.
- Free para aprobaciones manuales y Plus administrado por plataforma para integraciones/publicación, sin billing ni cobros automáticos.
- Publicación explícita de una revisión aceptada y campos seleccionados, verificación del acta y separación entre AdminTable privada y PublicTable de DTO público.
- Dashboard SSR `/p/SLUG` y API anónima paginada `/api/v1/public/projects/SLUG`, con CORS sin credenciales y sin acceso a tablas privadas.
- Despublicación y revocación disponibles a administradores vigentes aunque Plus esté vencido o el proyecto tenga escrituras congeladas.

Las pruebas locales incluyen plan/vigencia/alcance, revocación y replay, carreras, serialización del SDK real, CLI y DTO público exacto. Antes del rollout pasaron las 25 pruebas focalizadas de publicaciones, la comprobación sintáctica de sus módulos y cfn-lint de su plantilla. La revisión independiente detectó y corrigió una carrera de revocación durante el replay ganador de ingesta, con un test de barrera. Los resultados desplegados se registran por entorno a continuación; las pruebas locales no los sustituyen.

## Registro del rollout del incremento

| Entorno | Revisión y CI del incremento | Despliegue de seis stacks | Sitio y canary del producto | Limpieza y lectura posterior |
| --- | --- | --- | --- | --- |
| development | Pendiente de registrar | Pendiente de despliegue | Pendiente de verificación desplegada | Pendiente de comprobación |
| testing | Pendiente de registrar | Pendiente de despliegue | Pendiente de verificación desplegada | Pendiente de comprobación |
| production | Pendiente de registrar | Pendiente de despliegue | Pendiente de verificación desplegada | Pendiente de comprobación |

El sexto stack es `logsofchange-<entorno>-publications`; los cinco de la base conservan sus responsabilidades. La tabla de rollout acredita únicamente resultados efectivamente ejecutados y se completa con los commits, CI y reportes de cada promoción.

## Repetir consultas y operar

Con AWS CLI ya autenticado mediante una sesión de plataforma y el incremento desplegado, recuperar outputs públicos sin cambiar AWS:

```sh
node serverless/scripts/environment-status.mjs --environment=production
node serverless/scripts/environment-status.mjs --environment=production --write-outputs
```

Este lector espera publications; si falta, se detiene sin crear recursos ni usar el stack de otro entorno. El despliegue de producción exige main y `deploy.mjs --environment=production --approve-production=true`. Los comandos genéricos de smoke/QA no habilitan producción implícitamente; consultar el runner registrado antes de repetir una prueba que escriba datos sintéticos.

La asignación de Plus usa `set-product-plan.mjs`: preview por defecto y aplicación sólo con `--apply=true`, validando entorno, cuenta, proyecto activo y CAS. Producción exige main y `--approve-production=true`, también para el preview. El plan pertenece a la organización, sin que las APIs del cliente puedan otorgarlo. [Procedimiento de operación](runbook.md).

Las evidencias regenerables permanecen en la carpeta ignorada `serverless/.deployment/<entorno>/`: outputs públicos, reportes de QA/canary y capturas, sin contraseñas o tokens. Para el incremento, registrar además creación y revocación de clave, ejecución real del CLI, aprobación humana, publicación/consulta pública, despublicación y limpieza de las particiones/claim del mismo tenant UUID. No utilizar scans o eliminaciones de datos ajenos como limpieza de pruebas.

[REMOTE_HANDOFF.md](../../REMOTE_HANDOFF.md) contiene la continuación remota. [Contrato de integraciones y publicación](../architecture/contracts/integrations-public-v1.md) define rutas y DTO. El piloto con usuarios/proyecto reales, la importación y conciliación de un origen real, el selector reversible, los adjuntos y el billing siguen fuera de esta acreditación; no se crean aprobaciones históricas ni identidades de cliente inventadas.
