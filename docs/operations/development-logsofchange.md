# Desarrollo de Logs of Change — publicación verificada

Fecha: 2026-11-19. **Estado: publicado, verificado y entorno anterior retirado.**

Sitio: **https://dev.logsofchange.lynxpardelle.com**. Región: us-east-1. Marca: Logs of Change. Identificador técnico activo: logsofchange.

## Integración y ramas

La integración de la plataforma en development se realizó mediante el merge commit [18a469d](https://github.com/LynxPardelle/logs-of-change/commit/18a469d2afdb1ebe5bcd58754f945a6930b7516e), conservando íntegros el workflow y la documentación de promoción que ya tenía la rama.

| Rama remota | Referencia antes y después |
| --- | --- |
| testing | 423474a0ae01cb96164f54a58a27dbec02aa5442 |
| main | 10bd133eed06833208779e30818d6c55d500280f |

Las referencias locales de testing y main tampoco se movieron. No se desplegó ninguno de esos entornos. La promoción posterior sigue **development → testing → main** mediante los controles existentes. La rama de continuación es development.

La [CI de integración](https://github.com/LynxPardelle/logs-of-change/actions/runs/44616982904) y la [CI con las herramientas de retiro](https://github.com/LynxPardelle/logs-of-change/actions/runs/44617319584) terminaron correctamente. La segunda ejecutó 63 pruebas Node y 12 Angular, build SSR, empaquetadores y validación de las cuatro plantillas. Las revisiones documentales posteriores no cambian el bundle de aplicación desplegado.

## Entorno y nombres definitivos

Los cinco stacks terminaron en CREATE_COMPLETE:

- logsofchange-development-artifacts
- logsofchange-development-identity
- logsofchange-development-releases
- logsofchange-development-evidence
- logsofchange-development-edge

Cognito, tablas, buckets, funciones con nombre explícito, logs, políticas y configuración pública usan logsofchange. Los paquetes son logsofchange, logsofchange-services y logsofchange-web. Las revisiones/actas nuevas usan logsofchange.revision.v1 y logsofchange.acta.v1; se conserva la lectura del formato previo logs-of-change.acta.v1 sin reescribir hashes. La carpeta y el repositorio Git mantienen su nombre original logs-of-change.

Angular SSR se ejecuta en Lambda Node.js 24 ARM64 detrás de CloudFront OAC con Function URL AWS_IAM. ACM emitió el certificado del dominio nuevo y Route53 publicó sus registros A/AAAA y validación específica. El acceso anónimo directo a la Function URL devolvió 403; el sitio canónico devolvió 200 con HTML SSR, marca correcta y salud service=logsofchange.

El manifiesto de frontend verificado tiene SHA-256:

`2f26fee77d050f80e261a5a9a36e25ae2a2b59d101f7acf432498008c91a1cc1`

El hash describe el inventario del bundle, no el ZIP generado por AWS.

## Flujo completo de aprobación

El smoke desplegado pasó **12 comprobaciones integradas**, con identidades y datos exclusivamente sintéticos. El recorrido real de navegador confirmó:

1. Editor: login Cognito Code+PKCE, creación y presentación de entrega.
2. Revisor: solicitud de cambios con motivo y descarga del acta de revisión 1.
3. Editor: creación y presentación de revisión 2.
4. Revisor: aceptación de revisión 2 y descarga del acta final.
5. Nueva descarga de revisión 1, comprobando que contenido, digest y decisión anteriores permanecían iguales.

También se verificaron aislamiento de organización/proyecto/usuario, rechazo de ID tokens, prohibición de autoaprobación incluso para administrador, reintentos idempotentes y 409 con cuerpo distinto, carrera de dos revisores con una sola decisión, acta y detección de modificaciones, congelación 423 conservando lecturas y revocación 403 antes del replay.

La limpieza eliminó **4 usuarios, 7 filas de acceso y 22 filas de entregas**, sin fallos. Una lectura posterior confirmó cero usuarios y cero filas en ambas tablas del entorno nuevo. Las credenciales y tokens sólo existieron en memoria; los usuarios se crearon con mensajes suprimidos.

## Sitio y navegador

| Comprobación | Resultado |
| --- | --- |
| Escritorio 1280×900 | HTTP 200, ancho del documento 1280, sin desbordamiento |
| Móvil 390×844 | HTTP 200, ancho del documento 390, sin desbordamiento |
| Consola, página y red de la landing | Cero errores en ambas vistas |
| Salud/configuración | HTTP 200, producto Logs of Change, servicio logsofchange |
| Login | Cognito con nuevo prefijo, Code, PKCE S256 y state |
| UI autenticada | Solicitud de cambios, nueva revisión, aceptación y descarga de actas verificadas |

Las capturas fueron inspeccionadas visualmente. El repositorio de GitHub también tiene descripción Logs of Change y homepage apuntando al dominio de desarrollo nuevo.

## Retiro del entorno vacío anterior

Antes de publicar se comprobó cero usuarios, cero filas con scans consistentes y cero versiones de evidencia en el entorno sustituido. El bucket de artefactos contenía únicamente plantillas y bundles del producto. No hubo datos de clientes que trasladar.

Después del sitio y smoke aprobados, se ejecutó el retiro con inventarios explícitos, cuenta/región/propiedad verificadas y una segunda comprobación de vacío. Finalizó **16 acciones**: cinco stacks, dos tablas retenidas, pool vacío, bucket de evidencia vacío, artefactos versionados y su bucket, cinco log groups y el CNAME de validación exacto.

Las consultas posteriores no encontraron recursos del prefijo anterior en stacks activos, tablas, pools, buckets, funciones, logs, certificados ni registros DNS del producto. Los inventarios y el reporte de progreso se conservan sólo como evidencia histórica local ignorada. El entorno nuevo mantuvo su respuesta de salud correcta después del retiro.

## Evidencia local regenerable

Los reportes/capturas están ignorados en Git y no contienen contraseñas ni tokens:

- [Smoke completo](../../serverless/.deployment/development/logsofchange-smoke-report.json)
- [QA de navegador](../../serverless/.deployment/development/browser-qa/report.json)
- [Landing de escritorio](../../serverless/.deployment/development/browser-qa/desktop.png)
- [Landing móvil](../../serverless/.deployment/development/browser-qa/mobile-full.png)
- [Revisión aceptada](../../serverless/.deployment/development/reviewer-accepted.png)
- [Comprobación de limpieza](../../serverless/.deployment/development/post-cleanup.json)
- [Reporte de retiro](../../serverless/.deployment/migration-logsofchange/retirement-report.json)

[REMOTE_HANDOFF.md](../../REMOTE_HANDOFF.md) permite reconstruir outputs públicos mediante lecturas de CloudFormation y repetir pruebas. El piloto con usuarios/proyecto reales, importación y conciliación de un origen real y cargas de adjuntos verificadas siguen siendo incrementos separados del plan; esta publicación acredita el flujo nativo de aprobación sin adjuntos.
