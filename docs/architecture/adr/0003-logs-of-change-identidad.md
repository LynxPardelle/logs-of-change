# Logs of Change: identidad y continuidad del entorno

Fecha: 2026-11-19. Estado: aceptada por instrucción del propietario.

El producto conserva su nombre original **Logs of Change**, una referencia personal a **Wind of Change**, de Scorpions. El nombre conecta el historial de versiones con el propósito de revisar y aprobar cambios. El descriptor funcional permanece: «Revisión de entregas y aprobaciones con evidencia».

La interfaz utiliza el monograma LC, «Cada cambio, un rumbo claro» y «Que cada cambio encuentre su rumbo». Son textos propios que mantienen el foco en entregas y decisiones. Los paquetes y el proyecto Angular usan `logs-of-change`, `logs-of-change-services` y `logs-of-change-web`.

Esta decisión sustituye exclusivamente la selección de marca del ADR0002. Se conserva su arquitectura: Angular SSR Lambda detrás de CloudFront OAC y servicios independientes de identidad, entregas y evidencia.

Los recursos AWS existentes tienen nombres físicos `hitoclaro-*`, logs bajo `/hitoclaro/`, dominio Cognito con ese prefijo y dirección de desarrollo `dev.hitoclaro.lynxpardelle.com`. Se mantienen para actualizar el entorno existente sin reemplazar pools, tablas, buckets ni certificados. `hitoclaro` en esos identificadores es una compatibilidad operacional, no la marca visible. Un cambio futuro de dominio requiere su propia migración DNS/TLS y callbacks OIDC.

Las revisiones nuevas utilizan `logs-of-change.revision.v1` y las actas nuevas `logs-of-change.acta.v1`. El verificador acepta también `hitoclaro.acta.v1`; no reescribe manifiestos ya presentados ni cambia sus hashes. Los reportes fechados conservan los nombres y resultados que observaron.

Se conserva la rama `architecture/serverless-product-foundation`. La integración posterior tiene como destino development; las elevaciones continúan development → testing → main. El pipeline valida y empaqueta, sin publicar automáticamente en AWS ni promover ramas.

[Arquitectura](../ARCHITECTURE.md) · [Plan](../../../plan/architecture-serverless-product-1.md) · [Continuación remota](../../../REMOTE_HANDOFF.md).
