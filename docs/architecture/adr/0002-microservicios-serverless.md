# Microservicios serverless de Logs of Change

Fecha: 2026-11-19. Arquitectura vigente, identidad y entorno actualizados por ADR0004.

CloudFront entrega Angular SSR desde Lambda Node.js24 ARM64 con Function URL AWS_IAM y OAC. Identidad, entregas y evidencia se despliegan como stacks SAM independientes, con APIs, permisos y logs propios. Identidad administra Cognito y membresías; entregas es dueña de revisiones/decisiones/recibos; evidencia consulta la API autorizada de entregas sin acceso directo a su tabla.

Se eligió esta separación frente a mantener NestJS completo en una Lambda o servir exclusivamente una SPA estática desde S3. Los bundles estáticos se publican junto con el SSR para mantener una versión atómica. Los assets pueden separarse en S3 privado si el tráfico lo requiere.

Las escrituras comprueban autorización y versión dentro de la transacción. Los manifiestos y decisiones presentados se conservan; una revisión posterior exige una decisión nueva. La migración del origen sigue siendo explícita y conserva procedencia sin inventar aprobaciones.

La promoción sigue development → testing → main. [Identidad](0003-logs-of-change-identidad.md) · [Entorno logsofchange](0004-logsofchange-development.md) · [Arquitectura](../ARCHITECTURE.md).
