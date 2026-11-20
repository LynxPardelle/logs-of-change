# Piloto real: ZooBeriah Systems

Fecha local: 2026-11-19, Ciudad de México. Organización `zooberiah`, proyecto `zooberiah-systems`. Este registro distingue la validación técnica con identidades de prueba de la decisión actual que deben tomar las personas del piloto.

## Entrega elegida y alcance

La propuesta es **«ZooBeriah Systems: catálogo público de sitios web»**. El [JSON de envío](../../examples/pilots/zooberiah-systems/release.json) y su [procedencia verificada](../../examples/pilots/zooberiah-systems/README.md) describen tres cambios públicos: catálogo canónico en `/sitios-web`, redirección 301 desde `/landingpages` y navegación Servicios / Sitios web / Productos.

La fuente es el [PR #21 de ZooBeriah Systems](https://github.com/LynxPardelle/draft-zooberiahsystems-com/pull/21), commit `0143877663c9577d9b51c9d25b6d5e9acd35e4da`, con [despliegue y CI correctos](https://github.com/LynxPardelle/draft-zooberiahsystems-com/actions/runs/44636599501). El payload tiene SHA-256 `d9699cd282c1fc9c280251bf6e063d3484786d30ef7e1b48da62f872b2d66b2d`. La publicación anterior acredita procedencia, no una aceptación de Logs of Change: el piloto requiere presentar y decidir una revisión nueva.

No se cambió el repositorio de origen ni se importaron datos de clientes, credenciales, correos o decisiones históricas. Este piloto nativo no sustituye la exportación, conciliación y selección reversible del origen heredado previstas en TASK-005/006 del plan general.

## Validación técnica previa

El mismo JSON se envió mediante el CLI real en ámbitos UUID de prueba de development y testing. Se reutilizaron los recorridos versionados de smoke, mediante copias locales ignoradas que sólo adaptaron rutas, el payload público y el nombre explícito «Validación sintética de ZooBeriah Systems». Se conservaron las guardas de entorno, aislamiento y limpieza; no se habilitó producción ni se utilizaron las cuentas reales en esos recorridos.

| Entorno | Resultado | Evidencia posterior |
| --- | --- | --- |
| development | 17/17 comprobaciones; CLI real y replay, API, acta, publicación elegida y dashboard SSR de escritorio/móvil | 2026-11-20T00:35:27.201Z: cero usuarios y filas del ámbito propio, claim ausente y dashboard retirado 404 |
| testing | 17/17 comprobaciones; mismo payload, controles de acceso y recorrido público | 2026-11-20T00:35:27.394Z: cero usuarios y filas del ámbito propio, claim ausente y dashboard retirado 404 |

Cada recorrido limpió 4 usuarios, 15 filas de acceso, 28 de entregas, 7 administrativas de publicación y 1 pública, sin fallos. Las lecturas posteriores contaron únicamente el ámbito UUID del canary y comprobaron su claim; no eliminaron datos de otros proyectos. Se inspeccionaron seis capturas: vistas previas y dashboards de ambos entornos, con título y tres cambios correctos, resumen excluido, sin secretos, correos, actores, IDs privados ni desbordamientos.

La suite local pasó **137 pruebas Node, sin omisiones**. Incluye dos regresiones nuevas del alta inicial de Plus: AWS CLI puede devolver stdout vacío para un `get-item` exitoso sin fila. Sólo esa salida vacía se interpreta como ausencia; un proyecto inexistente o JSON no vacío malformado siguen bloqueando la escritura. Permanecen las condiciones de cuenta, ARN, rama, aprobación productiva y CAS.

## Preparación productiva y decisión pendiente

Se crearon las dos cuentas reales designadas por el propietario, usando las invitaciones nativas de Cognito autorizadas expresamente. La plataforma no generó ni leyó contraseñas, no marcó los correos como verificados y no impuso contraseñas permanentes. La respuesta de creación acreditó la solicitud de invitación y estado `FORCE_CHANGE_PASSWORD`, no la recepción en las bandejas.

El proyecto activo y cinco filas de acceso quedaron creados de forma transaccional y condicional: proyecto, dos membresías y dos permisos. Una cuenta tiene rol `editor`; la otra, `administrator`, para revisar y gestionar claves/publicación en este proyecto. No se asignaron permisos AWS a esas personas. El recibo operativo con identidades permanece local e ignorado, fuera de Git.

Antes del envío productivo falta completar el primer acceso y habilitar Plus con el comando corregido ya promovido a main. Después, el administrador crea una clave de corta duración; el CLI envía únicamente el borrador privado. Una persona presenta la revisión y la otra decide. No se crearán decisiones mediante escrituras de plataforma ni se usarán cuentas sintéticas para dar por aceptado este piloto.

Si se acepta, el administrador elige expresamente título y cambios para publicar bajo el slug propuesto `zooberiah-systems`. Hasta ejecutar esa acción, `/p/zooberiah-systems` no acredita un dashboard publicado. La verificación final debe comprobar actor, revisión, digest y acta registrada, además del DTO público y SSR anónimo. El resumen no se publicará por defecto.

## Continuar sin repetir invitaciones

Consultar primero el estado actual de las dos cuentas y del proyecto desde la sesión de plataforma autorizada, sin abrir archivos de credenciales. No reenviar invitaciones, resetear cuentas, sustituir permisos, borrar borradores o revocar acceso real automáticamente. Los correos y sujetos no se incluyen en este documento público.

El alta inicial de Plus se opera desde main limpio con `set-product-plan.mjs`: preview por defecto, y aplicación únicamente con `--apply=true --approve-production=true`. La cuenta administradora de cliente no puede asignarse Plus.

```sh
node --use-system-ca serverless/scripts/set-product-plan.mjs --environment=production --org=zooberiah --project=zooberiah-systems --plan=plus --approve-production=true
node --use-system-ca serverless/scripts/set-product-plan.mjs --environment=production --org=zooberiah --project=zooberiah-systems --plan=plus --approve-production=true --apply=true
```

Con una clave entregada al proceso mediante `LOGSOFCHANGE_API_KEY`, el envío productivo será:

```sh
node cli/logsofchange.mjs --environment=production --org=zooberiah --project=zooberiah-systems --file=examples/pilots/zooberiah-systems/release.json --idempotency-key=pilot-zooberiah-sites-0143877-r1-production
```

Este comando documenta el objetivo y no afirma que ya se haya ejecutado. Mantener la misma clave de idempotencia, contenido y credencial ante un resultado desconocido. La presentación y decisión se realizan en [Logs of Change](https://logsofchange.lynxpardelle.com), seleccionando «ZooBeriah Systems»; la UI actual no tiene un enlace directo a la entrega. La publicación se elige en [Integraciones](https://logsofchange.lynxpardelle.com/integrations).
