# Verificación inicial serverless — 19 de noviembre de 2026

Este documento conserva el resumen histórico del primer entorno de pruebas, anterior a la convención definitiva logsofchange. El informe completo original, sus nombres de recursos y el hash del artefacto permanecen en el historial Git del commit 16abd79169b622256083fe1465c30d31ec7b00d4. No se presentan sus dominios o recursos como activos.

En aquella verificación pasaron48 pruebas de servicios/Lambda,12 pruebas Angular, cuatro plantillas SAM y el build SSR. El flujo desplegado pasó12 comprobaciones integradas. Otra ejecución comprobó backup y restauración de DynamoDB en una tabla nueva con revisión/decisión/digest idénticos. Usuarios, datos, clon y backup sintéticos se limpiaron.

El entorno nuevo usa https://dev.logsofchange.lynxpardelle.com. Sus pruebas, estado de retiro anterior y continuación se documentan en [publicación de development](development-logsofchange.md) y [REMOTE_HANDOFF.md](../../REMOTE_HANDOFF.md). La promoción sigue development → testing → main.
