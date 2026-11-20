# Piloto real: ZooBeriah Systems

Fecha local: **2026-11-19, Ciudad de México**; las comprobaciones de cierre tienen fecha UTC 2026-11-20. **Estado: piloto real completado, revisión 1 aceptada desde la cuenta revisora, acta oficial verificada y dashboard público disponible.** Este registro distingue las comprobaciones sintéticas previas de la presentación y decisión personales del proyecto ZooBeriah Systems.

- [Dashboard público de ZooBeriah Systems](https://logsofchange.lynxpardelle.com/p/zooberiah-systems).
- [API pública del mismo proyecto](https://logsofchange.lynxpardelle.com/api/v1/public/projects/zooberiah-systems).

## Entrega elegida y alcance

La entrega es **«ZooBeriah Systems: catálogo público de sitios web»**. El [JSON de envío](../../examples/pilots/zooberiah-systems/release.json) y su [procedencia verificada](../../examples/pilots/zooberiah-systems/README.md) describen tres cambios públicos: catálogo canónico en `/sitios-web`, redirección 301 desde `/landingpages` y navegación Servicios / Sitios web / Productos.

La fuente es el [PR #21 de ZooBeriah Systems](https://github.com/LynxPardelle/draft-zooberiahsystems-com/pull/21), commit `0143877663c9577d9b51c9d25b6d5e9acd35e4da`, con [despliegue y CI correctos](https://github.com/LynxPardelle/draft-zooberiahsystems-com/actions/runs/44636599501). El archivo JSON público con saltos LF tiene SHA-256 `d9699cd282c1fc9c280251bf6e063d3484786d30ef7e1b48da62f872b2d66b2d`. La publicación anterior acredita procedencia. La aceptación de Logs of Change corresponde a una revisión nueva presentada y decidida personalmente durante este piloto; no se trasladó una aprobación histórica.

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

## Preparación productiva y acceso real

Se crearon las dos cuentas reales designadas por el propietario, usando las invitaciones nativas de Cognito autorizadas expresamente. El agente no generó ni leyó contraseñas; Cognito gestionó las temporales de invitación. No se marcaron los correos como verificados ni se impusieron contraseñas permanentes. La respuesta de creación acreditó la solicitud de invitación y estado `FORCE_CHANGE_PASSWORD`, no la recepción en las bandejas.

El proyecto activo y cinco filas de acceso quedaron creados de forma transaccional y condicional: proyecto, dos membresías y dos permisos. Una cuenta tiene rol `editor`; la otra, `administrator`, para revisar y gestionar claves/publicación en este proyecto. No se asignaron permisos AWS a esas personas. El recibo operativo con identidades permanece local e ignorado, fuera de Git.

Plus quedó habilitado desde main con el comando corregido. El preview inicial comprobó ausencia de plan; la aplicación condicional creó `plan: plus, active: true` y una lectura posterior confirmó ese estado a las `2026-11-20T00:45:31.674Z`. No se aplicó una suscripción cobrada ni se concedió Plus desde una identidad de cliente.

Las personas completaron su primer acceso y utilizaron sus cuentas para el recorrido real. La cuenta administradora creó en la consola una clave limitada a crear borradores, con caducidad configurada de **24 horas**. La CLI descargada de producción se contrastó con el cliente versionado, normalizando saltos LF, y se ejecutó desde el checkout del proyecto consumidor. No se concedieron a la clave permisos para consultar expedientes, presentar, aceptar o publicar.

## Ejecución real y decisión personal

Todas las fechas de esta tabla son UTC del **2026-11-20**; corresponden a la noche del 19 de noviembre en Ciudad de México.

| Hito | Fecha UTC | Resultado |
| --- | --- | --- |
| Envío desde el proyecto consumidor | 04:40:36.7447484Z | CLI real creó el borrador privado; su replay y la API directa devolvieron la misma entrega; la clave no pudo leer el expediente |
| Presentación personal | 04:46:04.724Z | Se presentó la revisión 1 desde la cuenta editora y quedó sellado su contenido |
| Aceptación personal | 04:56:31.157Z | Se aceptó la revisión 1 desde la cuenta revisora, distinta de la cuenta presentadora |
| Acta oficial contrastada | 04:57:27.771Z | El acta descargada de la consola coincidió con revisión y decisión almacenadas y pasó la verificación de integridad |
| Publicación elegida | 04:58:43.915Z | Se publicaron únicamente título y tres cambios; se excluyó el resumen |
| Revocación y conservación | 05:04:42.111Z | La clave quedó inactiva; la revisión aceptada, su acta y la proyección pública permanecieron conservadas |

La presentación y la aceptación fueron acciones personales realizadas desde las dos cuentas reales asignadas. No se generaron decisiones mediante escrituras de plataforma ni mediante identidades sintéticas. Las lecturas de comprobación vincularon los actores con las cuentas autorizadas, verificaron que sus sujetos de autenticación eran distintos y confirmaron la procedencia y el contenido exacto del JSON enviado. La integridad de revisión y decisión se comprobó sobre un snapshot atómico de plataforma y después se comparó con el acta oficial descargada de la UI. Los identificadores privados y el resumen de integridad del acta permanecen fuera de este documento.

Para ejecutar la publicación del dashboard, el agente operó la consola de la cuenta revisora/publicadora con la autorización otorgada para esa tarea. Seleccionó título y lista de cambios, revisó su vista previa y publicó. Esa operación administrativa fue posterior a la aceptación personal y no la sustituyó. La clave de integración no intervino en la decisión ni en la publicación.

## Consulta pública y cierre seguro

El verificador público pasó **7 comprobaciones de sólo lectura**: revisión 1 aceptada por la cuenta esperada, API anónima HTTP 200 con `no-store` y CORS sin credenciales, DTO limitado a título y tres cambios, identificador público independiente del privado, fechas coherentes, HTML SSR con el contenido real y ausencia de datos privados en JSON y HTML. La fecha pública de aceptación coincide con `2026-11-20T04:56:31.157Z` y la de publicación con `2026-11-20T04:58:43.915Z`.

La revisión de navegador comprobó escritorio de 1280 px y móvil de 390 px sin desbordamiento horizontal ni errores de consola. Las capturas se inspeccionaron visualmente y los cambios temporales del viewport se restablecieron. Una revisión independiente de HTTP anónimo a las 05:05:35 UTC volvió a confirmar HTTP 200, `no-store`, CORS `*` sin credenciales y una sola revisión pública con título y tres cambios, sin resumen, JWT, clave o correo. Estas verificaciones desplegadas no se presentan como una ejecución adicional de CI.

La clave del piloto se revocó desde la consola. Una lectura posterior de plataforma confirmó `active: false` y la vigencia configurada de 24 horas. **Se revocó la credencial; no se eliminaron los datos reales.** El estado aceptado, el acta oficial verificada y la publicación permanecieron conservados, y las consultas HTTP posteriores a la revocación siguieron correctas. El checkout consumidor no cambió durante el envío ni durante el cierre.

Los recibos de ingesta, aceptación, consulta pública y cierre y el acta permanecen en evidencia local ignorada. Las capturas de los canaries se conservan en sus carpetas ignoradas; las capturas nativas de la publicación real y su QA se inspeccionaron en este chat y sus métricas quedaron registradas localmente. No se publican correos, sujetos de Cognito, claves, sesiones, identificadores privados de la entrega, el acta o su digest privado. Los helpers operativos locales no forman parte de esta entrega documental.

## Continuar sin recrear el piloto

- Consultar el [dashboard](https://logsofchange.lynxpardelle.com/p/zooberiah-systems) o su [API pública](https://logsofchange.lynxpardelle.com/api/v1/public/projects/zooberiah-systems) sin iniciar sesión. Sólo devuelven la proyección elegida, sin el resumen ni el acta privada.
- Para revisar el expediente o descargar otra vez el acta, iniciar sesión con la cuenta personal autorizada en [Logs of Change](https://logsofchange.lynxpardelle.com), seleccionar **ZooBeriah Systems** y abrir **«ZooBeriah Systems: catálogo público de sitios web»**, revisión 1 aceptada.
- La gestión de la publicación continúa en [Integraciones](https://logsofchange.lynxpardelle.com/integrations). Su existencia y la conservación del estado aceptado no requieren mantener una clave de ingesta activa.
- No reenviar invitaciones, resetear cuentas, recrear el borrador ni repetir el envío o replay con la clave revocada. No sustituir permisos, borrar datos reales o despublicar automáticamente para volver a verificar. Una nueva entrega requiere una necesidad nueva, una credencial vigente y su propio comando; no forma parte de la consulta de este piloto cerrado.

El alta de Plus ya se completó. Su comando operativo conserva el preview de sólo lectura por defecto; no se debe repetir una aplicación para consultar el estado. El [runbook](runbook.md) recoge ese procedimiento. El [ejemplo de payload](../../examples/pilots/zooberiah-systems/README.md) documenta la procedencia y el resultado real, sin convertirlo en una orden de reenvío.

Este cierre actualiza únicamente evidencias y documentación. No modifica los servicios ni el frontend publicados y no requiere otro despliegue productivo. La conciliación de un origen heredado, su selector reversible y los adjuntos conservan el alcance pendiente del plan general.
