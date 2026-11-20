# Aprobación y evidencia de entregas de software

Logs of Change permite a una agencia presentar una entrega de software, obtener la decisión de un revisor autorizado y conservar la evidencia de la versión exacta que se revisó. El comprador inicial es la agencia que entrega software por hitos; las integraciones también sirven a equipos y proyectos externos. El acceso se organiza por proyecto y las capacidades del plan Plus pertenecen a la organización.

## Recorrido del piloto

1. Una persona administradora incorpora un proyecto y asigna acceso a un editor de la agencia y a un revisor del cliente.
2. El editor crea un borrador con el alcance de la entrega, referencias a cambios y evidencias opcionales. El sistema presenta la versión exacta al pedir revisión.
3. El revisor acepta esa versión o pide cambios con un motivo. Un ajuste crea otra versión, que requiere una nueva decisión.
4. El equipo consulta las decisiones y descarga un acta verificable de la entrega con la versión, el actor, la fecha y la integridad de las evidencias.

## Criterios de aceptación del producto

| ID | Comprobación |
| --- | --- |
| AC-01 | El editor puede preparar una entrega. Solo un revisor con acceso vigente al proyecto puede emitir la decisión para esa revisión. |
| AC-02 | El acceso con un usuario de otra organización o proyecto no permite consultar la entrega, su estado ni su adjunto. |
| AC-03 | Un cambio posterior produce una revisión nueva. El contenido, el resumen de integridad y la decisión ya registrados siguen disponibles para su versión original. |
| AC-04 | Reenviar la misma operación conserva el resultado. Dos decisiones simultáneas para la misma revisión producen una única decisión final. |
| AC-05 | El acta identifica su revisión y contiene los datos suficientes para comprobar que el contenido y las referencias a adjuntos corresponden a la evidencia registrada. |
| AC-06 | Una entrega histórica importada indica su origen. Carece de una aprobación del producto hasta que una persona autorizada revise una revisión nueva. |
| AC-07 | Un proyecto externo envía un borrador con una clave de alcance limitado y procedencia del servidor; esa clave no lee, presenta, decide ni publica. |
| AC-08 | Caducidad, revocación, plan Plus y congelación se comprueban antes del replay y transaccionalmente. Sólo la plataforma asigna el plan. |
| AC-09 | Un administrador publica expresamente campos seleccionados de una revisión aceptada. El dashboard y API anónimos reciben únicamente la proyección pública, sin actores, motivos o IDs privados. |
| AC-10 | Despublicar elimina futuras consultas públicas; revocar y despublicar siguen disponibles al administrador vigente aunque Plus venza o el proyecto se congele. |

## Integraciones como capacidad del producto

Free conserva el flujo manual de revisión. Plus habilita claves por proyecto, API HTTPS y CLI para clientes externos, sin exigirles una cuenta AWS, y publicaciones explícitas para consultas públicas. La plataforma habilita el plan administrativamente; no hay cobros o suscripciones simulados. Las claves se muestran una vez, se almacenan como hash, caducan como máximo en 90 días y se pueden revocar.

El dashboard `/p/SLUG` y su API pública muestran sólo el contenido seleccionado y métricas de publicaciones consultadas. La clave de ingesta no puede activar esa publicación. El [contrato de integraciones](../architecture/contracts/integrations-public-v1.md) y el [registro de rollout](../operations/production-logsofchange.md) distinguen implementación y verificaciones desplegadas.

El piloto mide la proporción de entregas decididas dentro del plazo acordado y el tiempo para localizar el acta de una entrega. El código actual implementa borradores, presentación, decisiones, nuevas revisiones y acta JSON, con pruebas de aislamiento, idempotencia y concurrencia. El frontend Angular SSR se sirve mediante Lambda; identidad, entregas, evidencia y publicaciones tienen stacks serverless independientes.

Los adjuntos no vacíos permanecen deshabilitados hasta verificar bytes, versiones y hashes en S3. La asignación inicial de acceso sigue siendo administrativa, sin invitaciones por correo ni alta pública. El acta comprueba integridad de contenido y coherencia de decisión; no equivale a firma legal. La conciliación de un origen real, la restauración y el corte por proyecto aún requieren un piloto identificado. [Estado y evidencias](../operations/development-logsofchange.md).
