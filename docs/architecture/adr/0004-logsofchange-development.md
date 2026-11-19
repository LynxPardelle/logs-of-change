# Entorno development con identificador logsofchange

Fecha: 2026-11-19. Estado: integración y publicación autorizadas por el propietario.

Todos los identificadores activos se unifican como logsofchange y el nombre visible como Logs of Change. Desarrollo usa https://dev.logsofchange.lynxpardelle.com; pruebas y producción se preparan como test.logsofchange.lynxpardelle.com y logsofchange.lynxpardelle.com, sin desplegarlas ni modificar sus ramas en esta entrega.

La inspección del entorno anterior confirmó cero usuarios, cero registros en AccessTable y ReleasesTable y cero versiones de evidencia. Por ello no hay datos de clientes ni decisiones que importar. Cambiar nombres físicos de stacks, pool, tablas, buckets y logs mediante sustituciones en sitio puede reemplazar recursos: se crean cinco stacks nuevos con el nombre definitivo y un certificado/DNS propios.

La secuencia es integrar development conservando sus controles de promoción; validar y publicar código/CI; desplegar los nuevos stacks; comprobar SSR, login, permisos y flujo completo de aprobación; y retirar el entorno vacío anterior sólo después de verificar el reemplazo. El retiro vuelve a comprobar ausencia de datos, cuenta/región y propiedad exacta de cada recurso. No afecta a testing ni main.

Los inventarios de origen, outputs, reportes y capturas se guardan en rutas locales ignoradas. El informe de publicación conserva las conclusiones sin credenciales. El historial Git contiene las decisiones y evidencias previas; el árbol activo utiliza exclusivamente la nomenclatura definitiva.

[Plan](../../../plan/architecture-serverless-product-1.md) · [Runbook](../../operations/runbook.md) · [Continuación remota](../../../REMOTE_HANDOFF.md).
