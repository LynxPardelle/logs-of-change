# Piloto de revisión: catálogo de ZooBeriah Systems

[release.json](release.json) es el payload utilizado en el **piloto real completado de ZooBeriah Systems**. Se envió como borrador privado mediante el CLI y la API productivos, se presentó y aceptó personalmente como revisión 1 y se publicó con los campos elegidos. Usa una entrega real anterior como material de revisión actual: el commit, el PR y el despliegue de origen acreditan procedencia, sin importar decisiones o aprobaciones históricas de Logs of Change.

La ejecución y sus comprobaciones constan en el [registro del piloto](../../../docs/operations/pilot-zooberiah-systems.md). **La clave de ingesta quedó revocada; los datos aceptados y la publicación permanecen conservados.** Este directorio no contiene cuentas personales, correos, identificadores de sesión, IDs privados de entrega, credenciales ni el acta privada.

- [Dashboard público](https://logsofchange.lynxpardelle.com/p/zooberiah-systems).
- [API pública](https://logsofchange.lynxpardelle.com/api/v1/public/projects/zooberiah-systems).

## Evidencia pública de la entrega de origen

- Repositorio público: [LynxPardelle/draft-zooberiahsystems-com](https://github.com/LynxPardelle/draft-zooberiahsystems-com).
- [PR #21: publicar el catálogo en sitios-web](https://github.com/LynxPardelle/draft-zooberiahsystems-com/pull/21), fusionado a main el `2026-11-19T23:19:02Z`.
- Merge commit: [0143877663c9577d9b51c9d25b6d5e9acd35e4da](https://github.com/LynxPardelle/draft-zooberiahsystems-com/commit/0143877663c9577d9b51c9d25b6d5e9acd35e4da).
- [Despliegue de producción y validación](https://github.com/LynxPardelle/draft-zooberiahsystems-com/actions/runs/44636599501) correctos para ese mismo commit, terminados el `2026-11-19T23:19:44Z`.

Al preparar este ejemplo se contrastaron estas respuestas mediante HTTP de sólo lectura, sin ejecutar formularios ni enviar analíticas del navegador:

| Consulta | Resultado observado |
| --- | --- |
| [Catálogo público](https://zooberiahsystems.com/sitios-web) | HTTP 200; título «Sitios web y proyectos publicados \| ZooBeriah Systems» y canonical `https://zooberiahsystems.com/sitios-web` |
| [Ruta anterior](https://zooberiahsystems.com/landingpages) | HTTP 301 con `Location: /sitios-web` |
| Navegación del HTML del catálogo | Incluye Servicios, Sitios web y Productos |

El payload se limita a esas tres afirmaciones comprobadas. No incorpora personas, contactos, datos de clientes, precios, fotografías, fuentes privadas o resultados de pruebas que no se hayan ejecutado. Las páginas pueden cambiar después; la revisión humana debe contrastar de nuevo lo que vaya a aceptar.

## Validación previa en desarrollo y pruebas

El mismo payload pasó **17 comprobaciones integradas en development y 17 en testing** mediante ámbitos UUID e identidades de prueba. Incluyeron CLI real y replay, API, actas y dashboard SSR de escritorio/móvil. Los ámbitos se limpiaron y las lecturas posteriores confirmaron su ausencia. No se utilizaron las cuentas reales para esas decisiones de prueba.

La corrección operativa detectada al habilitar Plus también se verificó por separado: stdout vacío de un `get-item` exitoso representa una fila ausente, mientras proyectos faltantes o JSON malformado bloquean la escritura. La promoción de esa corrección pasó **137 pruebas Node sin omisiones y 20 Angular**, build SSR, empaquetado y validación de cinco plantillas. El registro enlazado conserva las ejecuciones y merge commits de development → testing → main.

## Resultado productivo real

Fecha local: **19 de noviembre de 2026, Ciudad de México**. Las fechas de auditoría siguientes son UTC del 20 de noviembre:

| Operación | Resultado comprobado |
| --- | --- |
| CLI y API, 04:40:36 UTC | El CLI desde el checkout consumidor creó un borrador privado. El replay y la API directa devolvieron la misma entrega. La clave no pudo leer el expediente y el checkout de origen permaneció sin cambios |
| Presentación, 04:46:04.724 UTC | Se presentó personalmente la revisión 1 desde la cuenta editora |
| Decisión, 04:56:31.157 UTC | Se aceptó personalmente esa revisión desde la cuenta revisora, distinta de la cuenta presentadora |
| Acta, 04:57:27.771 UTC | El acta oficial descargada de la UI coincidió con los registros y pasó la verificación de integridad |
| Publicación, 04:58:43.915 UTC | El agente operó la consola de la cuenta revisora/publicadora con autorización para el dashboard; publicó únicamente `title` y `changes`, excluyendo `summary` |
| Cierre, 05:04:42.111 UTC | Se confirmó la revocación de la clave configurada para 24 horas. La revisión aceptada y la publicación permanecieron conservadas |

La consulta pública pasó siete comprobaciones de sólo lectura y revisión de navegador en escritorio de 1280 px y móvil de 390 px, sin desbordamiento horizontal ni errores de consola. Se comprobó SSR con el título y los tres cambios reales, HTTP 200, `no-store`, CORS sin credenciales y ausencia de resumen, actores, motivos, identificadores privados o secretos. Las comprobaciones posteriores a la revocación confirmaron que el dashboard y la API seguían disponibles; una revisión HTTP independiente confirmó el DTO y su misma fecha de aceptación. Estas comprobaciones desplegadas se distinguen de la CI de código.

La presentación y la aceptación personales no se ejecutaron desde la CLI ni mediante escrituras de plataforma. La operación administrativa de publicación fue posterior y no sustituyó la decisión de la persona revisora. El campo `source` permanece como procedencia privada del borrador y no se copia al DTO público. [Contrato vigente](../../../docs/architecture/contracts/integrations-public-v1.md).

## Consultar o adaptar sin reenviar este piloto

Para consultar el resultado, abrir el dashboard o la API públicos enlazados arriba. Para el expediente y el acta, iniciar sesión personalmente en [Logs of Change](https://logsofchange.lynxpardelle.com), seleccionar **ZooBeriah Systems** y abrir la entrega **«ZooBeriah Systems: catálogo público de sitios web»**, revisión 1 aceptada. La publicación se gestiona en [Integraciones](https://logsofchange.lynxpardelle.com/integrations).

**No reenviar invitaciones, recrear esta entrega o repetir el envío/replay con la clave revocada para volver a consultar el resultado.** No borrar datos reales ni retirar la publicación como si fueran el ámbito de un canary sintético. El piloto está cerrado y su evidencia debe conservarse.

El JSON puede servir de referencia para otro proyecto, pero una nueva entrega necesita contenido revisado, su organización/proyecto configurados, permisos, Plus y una credencial propia vigente. Su secreto se suministra sólo al proceso mediante `LOGSOFCHANGE_API_KEY`, sin argumentos, JSON o logs. Node.js 24 ejecuta el CLI sin dependencias ni cuenta AWS del consumidor; el [uso general del CLI](../../../cli/README.md) documenta sus parámetros. Una persona presenta y otra decide cada nueva revisión; una clave de ingesta nunca recibe esos permisos.
