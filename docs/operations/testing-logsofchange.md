# Pruebas de Logs of Change — publicación verificada

Fecha: 2026-11-19. **Estado: promovido a testing, desplegado y verificado.**

Sitio: **https://test.logsofchange.lynxpardelle.com**. Región: us-east-1. Marca: Logs of Change. Identificador técnico: logsofchange.

## Promoción y revisión desplegada

El [PR #337](https://github.com/LynxPardelle/logs-of-change/pull/337) promovió development a testing mediante merge commit [46f9d68](https://github.com/LynxPardelle/logs-of-change/commit/46f9d68f01e35a8412d570988d5e752633c2a85e), sin conflictos ni bypass de reglas. Pasaron el [check obligatorio de origen](https://github.com/LynxPardelle/logs-of-change/actions/runs/44624973719), la [validación del PR](https://github.com/LynxPardelle/logs-of-change/actions/runs/44624973764) y la [CI del commit integrado en testing](https://github.com/LynxPardelle/logs-of-change/actions/runs/44625225969).

El ajuste previo [956d4c6](https://github.com/LynxPardelle/logs-of-change/commit/956d4c6e73ae3b7986caa8721efaf4b12ff2f2b7) se hizo en development: QA de navegador admite únicamente los orígenes canónicos development/testing, comprueba su configuración y separa sus reportes. Las guardas siguen rechazando producción y destinos ajenos antes de lanzar navegador o escribir capturas. No hubo fallos de CI que requirieran otras correcciones.

**main permanece en 10bd133eed06833208779e30818d6c55d500280f**, igual que antes de la promoción; su referencia local tampoco se movió. No se desplegó producción. Los stacks de desarrollo no se actualizaron y su salud/configuración continuaron correctas. La cadena sigue siendo **development → testing → main**. Las actualizaciones documentales posteriores no cambian los bundles de aplicación desplegados.

## Entorno publicado

Los cinco stacks terminaron en CREATE_COMPLETE:

- logsofchange-testing-artifacts
- logsofchange-testing-identity
- logsofchange-testing-releases
- logsofchange-testing-evidence
- logsofchange-testing-edge

Usuarios Cognito, permisos, tablas, evidencia y artefactos son independientes de desarrollo. No se copiaron datos entre entornos. ACM emitió el certificado de testing y Route53 publicó sus registros propios. CloudFront **E2LWPT5IEJFX0M** terminó Deployed, con dominio d3696jdjki1rfi.cloudfront.net y alias del sitio de pruebas.

Angular SSR corre en Lambda Node.js 24 ARM64, protegida mediante AWS_IAM y CloudFront OAC. El sitio devolvió HTTP 200, HTML con `ng-server-context="ssr"` y marca correcta. Salud y configuración devolvieron HTTP 200, `service=logsofchange` y `environment=testing`. El acceso anónimo directo a la Function URL devolvió HTTP 403.

El build SSR, empaquetado, **65 pruebas Node sin omisiones**, **12 pruebas Angular** y cfn-lint de las cuatro plantillas pasaron. El manifiesto frontend de 49 archivos tiene SHA-256 `2f26fee77d050f80e261a5a9a36e25ae2a2b59d101f7acf432498008c91a1cc1` (inventario del bundle, no ZIP de AWS).

## Flujo real de aprobación

El smoke ejecutado entre 22:17 y 22:18 UTC pasó **12 comprobaciones**, exclusivamente con identidades y datos sintéticos. El recorrido Angular desplegado confirmó:

1. Editor: login Cognito Code+PKCE, creación de entrega y presentación de revisión 1.
2. Revisor: solicitud de cambios con motivo, descarga y verificación del acta de revisión 1.
3. Editor: creación y presentación de revisión 2.
4. Revisor: aceptación de revisión 2, descarga y verificación del acta final.
5. Nueva descarga del acta de revisión 1, conservando contenido, digest y decisión originales.

Además pasaron descubrimiento de membresía, aislamiento de organización/proyecto/usuario, rechazo de ID tokens, bloqueo de autoaprobación incluso como administrador, replay idempotente exacto y 409 ante otro cuerpo, carrera de dos revisores con una sola decisión, detección de actas modificadas, congelación 423 conservando lecturas y revocación 403 antes del replay.

La limpieza eliminó **4 usuarios, 7 filas de acceso y 22 filas de entregas**, sin fallos. Lecturas posteriores a las 22:18:51 UTC confirmaron cero usuarios y cero filas en ambas tablas, sin paginación pendiente. Las identidades se crearon con mensajes suprimidos; contraseñas y tokens sólo existieron en memoria.

## Sitio y navegador

Escritorio 1280×900 y móvil 390×844 devolvieron HTTP 200 sin desbordamiento horizontal. Ambas vistas tuvieron cero errores de consola, página, solicitudes y respuestas HTTP. Las capturas se revisaron visualmente. Login usó el dominio Cognito propio de testing con Code, PKCE S256 y state. La vista autenticada mostró revisión 2 aceptada y ambas decisiones con descarga de actas.

## Repetir y continuar desde remoto

Con el código de testing y AWS CLI ya autenticado, recuperar sólo los outputs públicos:

```sh
node --use-system-ca serverless/scripts/environment-status.mjs --environment=testing --write-outputs
node --use-system-ca serverless/scripts/qa-web.mjs https://test.logsofchange.lynxpardelle.com
node --use-system-ca serverless/scripts/smoke.mjs --environment=testing --report-name=logsofchange-smoke-report.json
```

El smoke escribe sólo su ámbito sintético y lo limpia al terminar; no usar --restore=true en testing. Publicar requiere la rama testing, build/empaquetado coherentes y revisión de CI. Los cambios se preparan en development y se vuelven a promover por PR con merge commit; no se corrige código directamente en testing.

Evidencia local ignorada y regenerable:

- [Smoke completo](../../serverless/.deployment/testing/logsofchange-smoke-report.json)
- [QA de navegador](../../serverless/.deployment/testing/browser-qa/report.json)
- [Landing de escritorio](../../serverless/.deployment/testing/browser-qa/desktop.png)
- [Landing móvil](../../serverless/.deployment/testing/browser-qa/mobile-full.png)
- [Revisión aceptada](../../serverless/.deployment/testing/reviewer-accepted.png)
- [SSR y protección de Lambda](../../serverless/.deployment/testing/public-snapshot.json)
- [Limpieza comprobada](../../serverless/.deployment/testing/post-cleanup.json)

No se abrieron .env, credenciales, notas de reuniones ni vaults. [REMOTE_HANDOFF.md](../../REMOTE_HANDOFF.md) documenta la continuación. El piloto con usuarios/proyecto reales, la importación y conciliación de un origen real y los adjuntos siguen pendientes separados del plan. Esta publicación acredita el flujo nativo de aprobación sin adjuntos; producción continúa pendiente de autorización y promoción desde testing.
