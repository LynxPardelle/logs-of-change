# Aprobación y evidencia de entregas de software

Logs of Change permite a una agencia presentar una entrega de software, obtener la decisión de un revisor autorizado y conservar la evidencia de la versión exacta que se revisó. El comprador inicial es la agencia que entrega software por hitos. La unidad comercial propuesta es el proyecto activo.

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

El piloto mide la proporción de entregas decididas dentro del plazo acordado y el tiempo para localizar el acta de una entrega. El código actual implementa borradores, presentación, decisiones, nuevas revisiones y acta JSON, con pruebas de aislamiento, idempotencia y concurrencia. El frontend Angular SSR se sirve mediante Lambda; identidad, entregas y evidencia tienen stacks serverless independientes.

Los adjuntos no vacíos permanecen deshabilitados hasta verificar bytes, versiones y hashes en S3. La asignación inicial de acceso sigue siendo administrativa, sin invitaciones por correo ni alta pública. El acta comprueba integridad de contenido y coherencia de decisión; no equivale a firma legal. La conciliación de un origen real, la restauración y el corte por proyecto aún requieren un piloto identificado. [Estado y evidencias](../operations/verification-2026-11-19.md).
