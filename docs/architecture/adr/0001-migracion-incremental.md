# ADR 0001 — Migración incremental a AWS serverless

- **Fecha** 2026-11-17
- **Estado** aceptado para la base de esta rama
- **Alcance** nuevo producto de revisión y aprobación de entregas de software

El API NestJS contiene la jerarquía de changelog y adaptadores para MongoDB y archivos. Sus operaciones CRUD y claves globales siguen siendo contratos de la aplicación existente. El producto requiere identidad del revisor, organizaciones aisladas, decisiones versionadas y verificación de evidencia. Una migración completa en un solo corte complicaría la conciliación de relaciones y la reversión.

Aplicamos Strangler por rutas y proyectos. AWS SAM administra el nuevo HTTP API y la función de salud. La primera porción de producto tendrá Cognito para identidad de personas, DynamoDB para operaciones transaccionales y S3 para adjuntos versionados con acceso privado. El API anterior conserva su origen durante el corte. Un importador externo al tráfico registra procedencia y verifica el material migrado.

Consideramos encapsular todo NestJS en Lambda. Eso facilitaría mantener rutas iniciales, pero también acoplaría un proceso Lambda al arranque de Mongoose y preservaría supuestos de archivos locales y claves globales. Consideramos un reemplazo inmediato, que exigiría resolver todos los contratos y todo el historial antes de obtener una prueba operativa. Las funciones separadas por porción de negocio ofrecen fallos más fáciles de aislar a cambio de operar dos superficies durante la transición.

El equipo deberá registrar por proyecto qué origen tiene autoridad. Solo se cortarán lecturas tras conciliar los datos de muestra. Las nuevas aprobaciones tendrán un escritor y un registro independiente de la infraestructura heredada. Las notificaciones diferidas justifican una cola cuando pasen al alcance. Un orquestador con estados explícitos queda sujeto a un flujo que realmente necesite esperas o compensaciones.

[Arquitectura y fases](../ARCHITECTURE.md)
