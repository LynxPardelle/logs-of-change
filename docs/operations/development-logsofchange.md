# Publicación de development — logsofchange

Fecha: 2026-11-19. Estado: en curso; el resultado final se registra al cerrar la publicación.

La integración conserva los controles de promoción de development y publica únicamente ese entorno. Testing y main permanecen sin cambios. El destino es https://dev.logsofchange.lynxpardelle.com y los cinco stacks usan logsofchange-development- como prefijo.

La inspección del entorno anterior verificó cero usuarios Cognito, cero filas en las dos tablas mediante lecturas consistentes y cero versiones de archivos en el bucket de evidencia. No hay datos de clientes que migrar. Los inventarios públicos exactos y reportes se guardan localmente en rutas ignoradas.

La secuencia es validar y empaquetar, publicar e inspeccionar CI de development, desplegar identidad/entregas/evidencia/frontend, comprobar sitio y flujo completo de aprobación y retirar el entorno vacío anterior con comprobación repetida de datos y propiedad de recursos.

[Plan](../../plan/architecture-serverless-product-1.md) · [Continuación remota](../../REMOTE_HANDOFF.md) · [Decisión del entorno](../architecture/adr/0004-logsofchange-development.md).
