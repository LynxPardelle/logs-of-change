# Piloto de revisión: catálogo de ZooBeriah Systems

[release.json](release.json) contiene una propuesta de **borrador nuevo** para la organización `zooberiah` y el proyecto `zooberiah-systems`. Usa una entrega real ya publicada como material de revisión actual. El commit, el PR y el despliegue anteriores sólo acreditan su procedencia: no se importan como decisiones o aprobaciones históricas de Logs of Change.

La presencia de estos archivos no acredita un envío, presentación, decisión o publicación del piloto. Esas operaciones deben comprobarse y registrarse después de ejecutarlas. Este ejemplo no contiene cuentas personales, correos, identificadores de sesión o credenciales.

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

## Preparar el envío a desarrollo y pruebas

Usar Node.js 24 y una clave del proyecto correspondiente a cada entorno. La operación de plataforma debe haber configurado la organización, el proyecto activo, sus permisos y Plus. Un administrador vigente del proyecto crea después la clave de integración; no puede asignarse Plus desde la consola. El secreto se suministra al proceso como `LOGSOFCHANGE_API_KEY` desde el gestor de secretos; no se incluye en argumentos, archivos del ejemplo o logs.

Desde la raíz de Logs of Change, ejecutar primero en desarrollo y después en pruebas, una vez preparados sus permisos y credenciales independientes:

```sh
node cli/logsofchange.mjs --environment=development --org=zooberiah --project=zooberiah-systems --file=examples/pilots/zooberiah-systems/release.json --idempotency-key=pilot-zooberiah-sites-0143877-r1-dev
node cli/logsofchange.mjs --environment=testing --org=zooberiah --project=zooberiah-systems --file=examples/pilots/zooberiah-systems/release.json --idempotency-key=pilot-zooberiah-sites-0143877-r1-test
```

Cada comando sólo intenta crear un borrador privado. Mantener su clave de idempotencia y el mismo contenido ante un resultado desconocido; no repetir con otra credencial para resolver un timeout. Si cambia el contenido que se desea revisar, tratarlo como otro comando y revisar su procedencia. El CLI también puede distribuirse al proyecto consumidor sin instalar dependencias ni requerir una cuenta AWS. [Uso del CLI](../../../cli/README.md).

Estos comandos son instrucciones de uso y no un registro de ejecución. Antes de promover estos datos/documentos, acreditar el payload y el flujo en development y testing. La ejecución posterior en producción exige su promoción y verificación por separado.

El payload ya pasó 17 comprobaciones integradas en development y 17 en testing mediante ámbitos UUID e identidades de prueba, con CLI real, API, actas y dashboard SSR; esos ámbitos se limpiaron y las lecturas posteriores confirmaron su ausencia. No se utilizaron las cuentas reales para esas decisiones de prueba. El [registro del piloto](../../../docs/operations/pilot-zooberiah-systems.md) distingue esos resultados de la presentación, decisión y publicación productivas pendientes.

## Revisión y publicación mediante personas

Después de un envío confirmado:

1. Una persona autorizada abre Entregas en el origen correspondiente de Logs of Change y revisa el borrador, su procedencia y las tres afirmaciones públicas antes de presentarlo.
2. Otra persona autorizada, distinta de quien preparó o presentó la revisión, decide en la consola si acepta o solicita cambios. El PR o CI de ZooBeriah no sustituyen esa decisión actual.
3. Si la revisión es aceptada, un administrador vigente entra en `/integrations`, previsualiza `title`, `summary` y `changes` y decide expresamente si publicarlos. La fecha de aceptación será la de esta nueva revisión, no la del despliegue de origen.
4. La consulta sin sesión sólo queda disponible después de esa publicación mediante `/p/SLUG` y `/api/v1/public/projects/SLUG`, con el slug elegido y reservado por el administrador.

No se añaden scripts para presentar, decidir o publicar en nombre de personas. Las claves de integración no tienen esos permisos. El campo `source` permanece como procedencia privada del borrador y no se copia al DTO público; la proyección propuesta sólo usa título, resumen y cambios, todos publicables. [Contrato vigente](../../../docs/architecture/contracts/integrations-public-v1.md).
