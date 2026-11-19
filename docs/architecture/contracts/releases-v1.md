# Contrato HTTP v1 de Logs of Change

Este contrato corresponde a las rutas serverless nuevas. La API NestJS heredada mantiene sus contratos durante la migración. Los nombres del repositorio histórico no identifican un servicio nuevo ni una organización autorizada.

## Transporte, identidad y acceso

La consola utiliza rutas relativas del mismo origen HTTPS. API Gateway valida un JWT de Cognito contra el emisor y cliente de su entorno. Las rutas protegidas requieren un access token con el scope `openid`, además del `sub` de persona. El servicio comprueba la pertenencia activa a la organización, el proyecto y el permiso vigente en cada operación, incluidos los reintentos. No se acepta una API key heredada como identidad de revisor.

`orgId`, `projectId` e IDs de recursos forman parte del contexto que debe autorizarse. Conocer un ID no permite leer otra organización. Las respuestas de negocio y autenticación usan `Cache-Control: no-store` y CloudFront no debe almacenarlas.

| Rol activo en el proyecto | Operaciones |
| --- | --- |
| `editor` | Leer, preparar una entrega, presentar y crear otra revisión después de cambios solicitados. |
| `reviewer` | Leer y decidir una revisión pendiente. |
| `administrator` | Operaciones de editor y revisor, con la misma prohibición de autoaprobación. |

Quien creó, preparó o presentó la entrega no puede decidir esa entrega aunque tenga rol de administración. La autorización vuelve a comprobarse transaccionalmente al escribir para evitar que una revocación compita con una decisión.

## Rutas y respuestas

En la tabla, `B` representa `/api/v1/orgs/{orgId}/projects/{projectId}/releases`.

| Método y ruta | Entrada | Respuesta |
| --- | --- | --- |
| `GET /api/v1/health` | Pública. | `{ "status": "ok", "service": "logsofchange" }`. |
| `GET /api/v1/config` | Pública; sólo configuración del cliente. | `{ product, environment, auth: { issuer, clientId, domain, redirectUri }, services }`. Ningún secreto. |
| `GET /api/v1/identity/me` | Token de persona. | `{ sub, memberships: [{ orgId, orgName, projects: [{ projectId, name, role }] }] }`. |
| `GET B` | `cursor` opcional de la página anterior; `limit` de 1 a 50, por defecto 20. | `{ releases: Release[], nextCursor }`; no recorre otras particiones. |
| `POST B` | `{ title, summary, changes: string[] }`. | `{ release }`; borrador de revisión 1. |
| `GET B/{id}` | — | `{ release, revisions, decisions }`. |
| `POST B/{id}/submit` | `{ expectedRevision }`. | `{ release, revision }`; sella el manifiesto. |
| `POST B/{id}/decisions` | `{ expectedRevision, outcome, reason }`. | `{ release, decision }`; `outcome` es `accepted` o `changes_requested`. |
| `POST B/{id}/revisions` | `{ expectedRevision, title, summary, changes: string[] }`. | `{ release }`; nuevo borrador después de cambios solicitados. |
| `GET B/{id}/revisions/{n}` | — | `{ revision, decision }`; la decisión puede no existir aún. |
| `GET /api/v1/evidence/orgs/{orgId}/projects/{projectId}/releases/{id}/revisions/{n}/acta` | Token de persona con acceso al proyecto. | Acta JSON verificable de una revisión presentada y su decisión registrada. |

Los IDs de organización, proyecto y entrega cumplen `[A-Za-z0-9][A-Za-z0-9_-]{0,127}`. `title` admite de 1 a 160 caracteres; `summary`, hasta 8.000; `changes`, hasta 30 elementos de 1 a 700 caracteres. `expectedRevision` es un entero positivo y cada entrega admite hasta 50 revisiones. El cursor base64url sólo continúa la consulta autorizada de un proyecto; no es una concesión de acceso. Las respuestas no incluyen filas internas de DynamoDB ni recibos de otras operaciones.

```json
{
  "id": "release-id",
  "orgId": "agency-id",
  "projectId": "project-id",
  "title": "Portal de seguimiento",
  "summary": "Entrega del hito acordado.",
  "changes": ["Se añadió la vista de seguimiento."],
  "revision": 1,
  "status": "draft",
  "createdBy": "cognito-sub",
  "createdAt": "2026-11-19T12:00:00.000Z",
  "updatedAt": "2026-11-19T12:00:00.000Z",
  "version": 1
}
```

## Revisiones, decisión e idempotencia

El flujo es `draft → pending_review → accepted | changes_requested`. Sólo `changes_requested` permite crear otro borrador; la revisión nueva incrementa `revision`. Las revisiones presentadas conservan contenido, hash y decisiones originales. Presentar produce un manifiesto canónico y SHA-256; decidir registra actor, fecha del servidor y la revisión exacta. Una solicitud de cambios requiere motivo.

Todas las mutaciones requieren `Idempotency-Key`, de 1 a 128 caracteres alfanuméricos o `._:-`, con un primer carácter alfanumérico. El recibo vincula organización, proyecto, actor, operación y digest del cuerpo normalizado. Un reintento autorizado con la misma clave y cuerpo devuelve la respuesta registrada. La misma clave con otro cuerpo produce `409`. Cambiar `expectedRevision` cambia el comando; no reutilices la clave de un intento anterior para ese cuerpo nuevo. Los recibos no tienen TTL en esta entrega: no se promete una ventana de expiración que permita repetir una decisión antigua.

La escritura de estado, revisión o decisión y recibo ocurre en una transacción con condiciones de versión y autorización vigente. Dos revisores que deciden a la vez sobre la misma revisión sólo pueden producir una decisión final. El cliente debe recargar al recibir un conflicto y mostrar el estado registrado antes de ofrecer otro intento.

## Errores y límites de la entrega actual

El cuerpo de error tiene forma `{ "error": { "code": "...", "message": "..." } }`. Las rutas no exponen secretos ni tokens en errores o logs.

| HTTP | Código | Significado |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Campo, cursor, revisión o clave de idempotencia inválidos. |
| `401` | `UNAUTHORIZED` | Token ausente o inválido. |
| `403` | `FORBIDDEN`, `SELF_REVIEW` | Acceso insuficiente/revocado o intento de decidir una entrega propia. |
| `404` | `NOT_FOUND` | Recurso inexistente en el proyecto autorizado. |
| `409` | `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `REVISION_LIMIT` | Estado/revisión en conflicto, clave reutilizada con otro cuerpo o límite de revisiones. |
| `413` | `PAYLOAD_TOO_LARGE` | Cuerpo que supera el límite del servicio. |
| `422` | `ATTACHMENTS_UNAVAILABLE` | Se intentó usar un adjunto antes de habilitar la verificación de evidencia. |
| `423` | `WRITES_FROZEN` | El proyecto tiene escrituras congeladas; consultas autorizadas y actas siguen disponibles. |

La administración puede fijar `writesFrozen: true` en el registro de proyecto de AccessTable. Se bloquean todos los comandos, también el replay de recibos. La verificación ocurre antes del replay y dentro de la transacción; se permite false o ausencia del campo, mientras un valor malformado falla cerrado. Revocar acceso conserva su semántica403 y no equivale a congelar sólo escrituras.

Los adjuntos no están habilitados en esta entrega: no se aceptan listas no vacías de `attachments` y las referencias históricas de medios no equivalen a evidencia verificada. El bucket privado versionado es preparación de infraestructura. Faltan el flujo de carga, verificación de bytes, tamaño, tipo y checksum, firma de acceso y política de retención de evidencia antes de habilitar adjuntos.

La revisión devuelta tiene `{ number, manifest, digest, digestAlgorithm: "SHA-256", canonicalization: "sorted-json-v1", submittedAt }`. La decisión tiene `{ revision, outcome, reason, actor, decidedAt, manifestDigest }`. El acta identifica ambas y permite comprobar integridad de los datos incluidos. No es una firma legal ni prueba autoría o fecha fuera de los controles de la aplicación. Una entrada heredada se importa como historial con procedencia y **sin aprobación**; requiere una revisión nueva y una decisión de una persona autorizada para obtener una aprobación del producto.

## Conciliación antes de activar lecturas históricas

La herramienta [de migración offline](../../../serverless/scripts/migration/README.md) produce y compara proyecciones con una lista explícita de campos. La comprobación sintética valida la herramienta; no valida un proyecto real. Antes de activar una selección de origen deben existir mapeo de organización verificado, exportación de lectura acotada, cero conflictos, paridad de conteos/referencias/hashes y reversión demostrada. El servicio no activa esa migración por el solo hecho de crear infraestructura.

## Identidad y compatibilidad de evidencia

Las revisiones nuevas usan logsofchange.revision.v1 y las actas nuevas logsofchange.acta.v1. El verificador también admite logs-of-change.acta.v1 para evidencia ya exportada. El cambio de marca no reescribe manifiestos ni hashes anteriores. Los prefijos físicos AWS no forman parte de la autorización del cliente.
