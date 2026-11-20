# Piloto real: ZooBeriah Systems

Fecha local: 2026-11-19, Ciudad de México. Organización `zooberiah`, proyecto `zooberiah-systems`. Este registro distingue la validación técnica con identidades de prueba de la decisión actual que deben tomar las personas del piloto.

## Entrega elegida y alcance

La propuesta es **«ZooBeriah Systems: catálogo público de sitios web»**. El [JSON de envío](../../examples/pilots/zooberiah-systems/release.json) y su [procedencia verificada](../../examples/pilots/zooberiah-systems/README.md) describen tres cambios públicos: catálogo canónico en `/sitios-web`, redirección 301 desde `/landingpages` y navegación Servicios / Sitios web / Productos.

La fuente es el [PR #21 de ZooBeriah Systems](https://github.com/LynxPardelle/draft-zooberiahsystems-com/pull/21), commit `0143877663c9577d9b51c9d25b6d5e9acd35e4da`, con [despliegue y CI correctos](https://github.com/LynxPardelle/draft-zooberiahsystems-com/actions/runs/44636599501). El archivo JSON con saltos LF tiene SHA-256 `d9699cd282c1fc9c280251bf6e063d3484786d30ef7e1b48da62f872b2d66b2d`. La publicación anterior acredita procedencia, no una aceptación de Logs of Change: el piloto requiere presentar y decidir una revisión nueva.

No se cambió el repositorio de origen ni se importaron datos de clientes, credenciales, correos o decisiones históricas. Este piloto nativo no sustituye la exportación, conciliación y selección reversible del origen heredado previstas en TASK-005/006 del plan general.

## Validación técnica previa

El mismo JSON se envió mediante el CLI real en ámbitos UUID de prueba de development y testing. Se reutilizaron los recorridos versionados de smoke, mediante copias locales ignoradas que sólo adaptaron rutas, el payload público y el nombre explícito «Validación sintética de ZooBeriah Systems». Se conservaron las guardas de entorno, aislamiento y limpieza; no se habilitó producción ni se utilizaron las cuentas reales en esos recorridos.

| Entorno | Resultado | Evidencia posterior |
| --- | --- | --- |
| development | 17/17 comprobaciones; CLI real y replay, API, acta, publicación elegida y dashboard SSR de escritorio/móvil | 2026-11-20T00:35:27.201Z: cero usuarios y filas del ámbito propio, claim ausente y dashboard retirado 404 |
| testing | 17/17 comprobaciones; mismo payload, controles de acceso y recorrido público | 2026-11-20T00:35:27.394Z: cero usuarios y filas del ámbito propio, claim ausente y dashboard retirado 404 |

Cada recorrido limpió 4 usuarios, 15 filas de acceso, 28 de entregas, 7 administrativas de publicación y 1 pública, sin fallos. Las lecturas posteriores contaron únicamente el ámbito UUID del canary y comprobaron su claim; no eliminaron datos de otros proyectos. Se inspeccionaron seis capturas: vistas previas y dashboards de ambos entornos, con título y tres cambios correctos, resumen excluido, sin secretos, correos, actores, IDs privados ni desbordamientos.

La suite local pasó **137 pruebas Node, sin omisiones**. Incluye dos regresiones nuevas del alta inicial de Plus: AWS CLI puede devolver stdout vacío para un `get-item` exitoso sin fila. Sólo esa salida vacía se interpreta como ausencia; un proyecto inexistente o JSON no vacío malformado siguen bloqueando la escritura. Permanecen las condiciones de cuenta, ARN, rama, aprobación productiva y CAS.

La corrección también se comprobó contra AWS en namespaces UUID temporales: preview sin escritura, primera activación de Plus, lectura del plan activo y limpieza condicional de proyecto y plan. Las dos filas propias quedaron ausentes en development a las `2026-11-20T00:39:54.219Z` y en testing a las `2026-11-20T00:42:59.026Z`. Estas comprobaciones no modificaron el proyecto productivo real.

## Promoción de la corrección operativa

El [PR #347](https://github.com/LynxPardelle/logs-of-change/pull/347) integró la corrección y el ejemplo en development `c34c4146da005ef7f55088f218604b13dd8d633f`, con [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44647476418). El [PR #348](https://github.com/LynxPardelle/logs-of-change/pull/348) elevó testing a `563f9491d24464a0c903db98b552768428fb6402`, con [CI correcta](https://github.com/LynxPardelle/logs-of-change/actions/runs/44647876308). Tras las comprobaciones desplegadas, el [PR #349](https://github.com/LynxPardelle/logs-of-change/pull/349) elevó main a `f00231a7b9d3a511ba2323dd36ee4a93937d4eb1`, con [CI correcta para ese HEAD](https://github.com/LynxPardelle/logs-of-change/actions/runs/44648238925).

La CI verificó 137 pruebas Node sin omisiones, 20 Angular, build SSR, empaquetado y cinco plantillas. El cambio de código afecta al comando operativo; los servicios, frontend y cliente CLI conservan el código publicado y verificado del incremento anterior. La promoción se realizó por merge commit y mantuvo los controles development → testing → main.

## Preparación productiva y decisión pendiente

Se crearon las dos cuentas reales designadas por el propietario, usando las invitaciones nativas de Cognito autorizadas expresamente. La plataforma no generó ni leyó contraseñas, no marcó los correos como verificados y no impuso contraseñas permanentes. La respuesta de creación acreditó la solicitud de invitación y estado `FORCE_CHANGE_PASSWORD`, no la recepción en las bandejas.

El proyecto activo y cinco filas de acceso quedaron creados de forma transaccional y condicional: proyecto, dos membresías y dos permisos. Una cuenta tiene rol `editor`; la otra, `administrator`, para revisar y gestionar claves/publicación en este proyecto. No se asignaron permisos AWS a esas personas. El recibo operativo con identidades permanece local e ignorado, fuera de Git.

Plus quedó habilitado desde main con el comando corregido. El preview inicial comprobó ausencia de plan; la aplicación condicional creó `plan: plus, active: true` y una lectura posterior confirmó ese estado a las `2026-11-20T00:45:31.674Z`. No se aplicó una suscripción cobrada ni se concedió Plus desde una identidad de cliente.

Falta completar el primer acceso de las personas. Después, el administrador crea una clave de corta duración; el CLI envía únicamente el borrador privado desde el checkout consumidor. Una persona presenta la revisión y la otra decide. No se crearán decisiones mediante escrituras de plataforma ni se usarán cuentas sintéticas para dar por aceptado este piloto. La CLI descargada de producción se contrastó con el cliente versionado, normalizando saltos LF; aún no se ha usado una clave real en producción.

Si se acepta, el administrador elige expresamente título y cambios para publicar bajo el slug propuesto `zooberiah-systems`. Hasta ejecutar esa acción, `/p/zooberiah-systems` no acredita un dashboard publicado. La verificación final debe comprobar actor, revisión, digest y acta registrada, además del DTO público y SSR anónimo. El resumen no se publicará por defecto.

## Continuar sin repetir invitaciones

Consultar primero el estado actual de las dos cuentas y del proyecto desde la sesión de plataforma autorizada, sin abrir archivos de credenciales. No reenviar invitaciones, resetear cuentas, sustituir permisos, borrar borradores o revocar acceso real automáticamente. Los correos y sujetos no se incluyen en este documento público.

El alta inicial de Plus ya se completó. Para inspecciones posteriores, `set-product-plan.mjs` conserva el preview de sólo lectura por defecto; una nueva aplicación requiere `--apply=true --approve-production=true` desde main limpio. No repetir una escritura sólo para consultar el estado. La cuenta administradora de cliente no puede asignarse Plus.

```sh
node --use-system-ca serverless/scripts/set-product-plan.mjs --environment=production --org=zooberiah --project=zooberiah-systems --plan=plus --approve-production=true
node --use-system-ca serverless/scripts/set-product-plan.mjs --environment=production --org=zooberiah --project=zooberiah-systems --plan=plus --approve-production=true --apply=true
```

Con una clave entregada al proceso mediante `LOGSOFCHANGE_API_KEY`, el envío productivo será:

```sh
node cli/logsofchange.mjs --environment=production --org=zooberiah --project=zooberiah-systems --file=examples/pilots/zooberiah-systems/release.json --idempotency-key=pilot-zooberiah-sites-0143877-r1-production
```

Este comando documenta el objetivo y no afirma que ya se haya ejecutado. Mantener la misma clave de idempotencia, contenido y credencial ante un resultado desconocido. La presentación y decisión se realizan en [Logs of Change](https://logsofchange.lynxpardelle.com), seleccionando «ZooBeriah Systems»; la UI actual no tiene un enlace directo a la entrega. La publicación se elige en [Integraciones](https://logsofchange.lynxpardelle.com/integrations).
