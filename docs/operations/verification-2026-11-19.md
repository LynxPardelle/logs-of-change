# Verificación de HitoClaro — 19 de noviembre de 2026

Documento histórico de la primera publicación con la marca provisional. La identidad vigente es [Logs of Change](../architecture/adr/0003-logs-of-change-identidad.md); el estado de continuación remota y los comandos actuales están en [REMOTE_HANDOFF.md](../../REMOTE_HANDOFF.md). Los nombres, hashes y el estado Git que siguen describen aquella comprobación, no sustituyen el HEAD y CI actuales.

## Resultado

**Entorno de desarrollo desplegado y comprobado:** https://dev.hitoclaro.lynxpardelle.com

Angular SSR se ejecuta en Lambda Node.js24 ARM64 mediante Function URL AWS_IAM y CloudFront OAC. Identidad, entregas y evidencia tienen HTTP API, Lambda y stack SAM independientes. El dominio tiene certificado ACM emitido y registros A/AAAA propios en Route53, en us-east-1.

Los cinco stacks propios del entorno terminaron en CREATE_COMPLETE o UPDATE_COMPLETE: `hitoclaro-development-artifacts`, `identity`, `releases`, `evidence` y `edge` con ese prefijo. Testing y producción no se desplegaron en esta ejecución. Los hosts previstos son `test.hitoclaro.lynxpardelle.com` y `hitoclaro.lynxpardelle.com`.

## Validaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Servicios, migración, DynamoDB SDK y artefacto SSR Lambda | **48/48 tests**, sin omisiones |
| Angular | **12/12 tests** |
| Build de producción Angular SSR | Correcto; runtime Angular22.2.6, SSR/CLI22.2.7 y NgRx Signals22.0.1 |
| cfn-lint de edge, identidad, entregas y evidencia | Cuatro plantillas correctas en us-east-1 |
| Auditoría npm de dependencias de producción | Cero hallazgos en web y serverless; no implica auditoría del backend heredado |
| QA visual en navegador | Escritorio1280×900 y móvil390×844, HTTP200 y sin desbordamiento horizontal |
| Consola y red de la landing final | Cero errores de consola, página, solicitudes o respuestas HTTP de error |
| Salud y configuración por dominio público | HTTP200; salud identifica service=hitoclaro y no-store |
| Acceso anónimo directo a la Function URL del frontend | HTTP403; acceso público sólo a través de CloudFront autorizado |
| Login | Cognito Authorization Code + PKCE S256 y state; callback Angular real comprobado |
| Git whitespace | git diff --check correcto; sólo avisos LF/CRLF de Windows |

El build final de frontend tiene manifiesto SHA-256 `2640b4f8f3bfbd7a2639d6675c6137fdf4e0eac1b8750f0aee87dd2724b02c9b`. El manifiesto describe el inventario de archivos, no el hash ZIP que calcula AWS.

## Flujo desplegado

La ejecución final pasó **12 comprobaciones integradas**, con cuatro identidades y datos exclusivamente sintéticos, a través del dominio CloudFront:

1. Salud/configuración y protección sin token.
2. Login real con Cognito y PKCE; mensajes de creación de usuarios suprimidos.
3. Descubrimiento de proyectos limitado al actor.
4. Callback real de Angular, selección de proyecto, creación de borrador y presentación desde la interfaz; logout y ausencia de refresh token almacenado.
5. Creación por API y replay exacto; misma clave con otro cuerpo produce409.
6. Aislamiento por organización, proyecto, usuario ajeno y rechazo de ID token.
7. Presentación inmutable y autoaprobación bloqueada incluso para administrador.
8. Dos revisores reales compiten: una decisión200 y un conflicto409.
9. Acta descargada con digest y vínculos de revisión/decisión válidos; modificación detectada.
10. Nueva revisión y decisión, preservando contenido y decisión anteriores.
11. Congelación de comandos/replays con423 manteniendo consultas y acta autorizadas; reapertura explícita.
12. Revocación de membresía impide consultar y repetir un recibo antes exitoso.

Una ejecución adicional pasó **11 comprobaciones**, incluyendo **backup y restauración reales de DynamoDB en una tabla nueva temporal**. La revisión aceptada y su decisión se recuperaron exactamente, y el digest volvió a verificarse. No se restauró sobre la tabla original. Esta prueba usa datos sintéticos y no acredita un corte o recuperación de datos de un cliente real.

La limpieza final no reportó fallos. El flujo final eliminó4 usuarios,7 filas de acceso y15 filas de entregas; el flujo de recuperación eliminó4 usuarios,7 filas de acceso y11 filas de entregas, además del clon restaurado y su backup. Una lectura posterior confirmó **cero usuarios sintéticos restantes y ninguna tabla temporal hitoclaro-smoke-**.

## Evidencia local

Los reportes y capturas están ignorados en Git; este documento conserva el resumen verificable sin tokens ni contraseñas.

- [Reporte final de flujo](../../serverless/.deployment/development/smoke-final-report.json)
- [Reporte de recuperación](../../serverless/.deployment/development/smoke-report.json)
- [Reporte de navegador](../../serverless/.deployment/development/browser-qa/report.json)
- [Escritorio](../../serverless/.deployment/development/browser-qa/desktop.png)
- [Móvil](../../serverless/.deployment/development/browser-qa/mobile-full.png)
- [Espacio autenticado con datos sintéticos](../../serverless/.deployment/development/authenticated-workspace.png)

El smoke inicial detectó un fallo en su captura de redirect OAuth; se corrigió el comprobador y se volvió a ejecutar. El QA inicial detectó un favicon404; se corrigió y se publicó el artefacto final antes de repetir el QA completo. Los intentos sintéticos anteriores también terminaron con limpieza sin fallos.

## Estado para continuar

La rama sigue siendo `architecture/serverless-product-foundation`, con base `5f0042a624452db02fd6d7813fdad67278e1a1be`. Los cambios nuevos permanecen en el árbol local sin commit ni push; el workflow CI está preparado pero no se ha ejecutado en GitHub. La carpeta y origin históricos se conservan, y no se modificó el trabajo de Notion ni las ramas development/testing/main.

Completado el flujo de producto sin adjuntos y el entorno de desarrollo. El primer pendiente del piloto es TASK-005: escoger organización/proyecto y exportación autorizada de una fuente real, cargar en un entorno aislado y conciliar. Después, TASK-006 requiere selector reversible de lectura y demostración de paridad. TASK-008 sigue parcial por carga/verificación de adjuntos y referencias S3; TASK-009 necesita autoridad y aprobación de corte del proyecto real, aunque recuperación sintética y congelación ya están comprobadas.

La asignación de personas reales sigue siendo administrativa; no se habilitó alta pública ni se enviaron invitaciones. Antes del piloto hay que definir retención de evidencia, umbrales/destinatarios de alertas y la política operacional del proyecto. La promoción se mantiene **development → testing → main**, con revisión explícita para producción.
