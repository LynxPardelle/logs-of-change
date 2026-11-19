# Integraciones y publicaciones HTTP v1

Las integraciones permiten enviar borradores desde proyectos externos sin cuenta AWS. El plan Plus habilita la creación de claves y publicaciones. La asignación de Plus es una operación de plataforma; esta entrega no procesa pagos ni representa una suscripción cobrada.

## Claves y capacidad del proyecto

Las siguientes rutas exigen un access token personal de Cognito y acceso vigente al proyecto. B representa /api/v1/identity/orgs/{orgId}/projects/{projectId}.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | B/capabilities | {plan, integrations, publicPublishing, role}; falta de Plus cierra ambas capacidades |
| GET | B/integration-keys | Sólo administrador: {keys:[{id,name,active,expiresAt,createdAt}]} |
| POST | B/integration-keys | Sólo administrador con Plus: {name,expiresInDays}; responde201 con {key,token} |
| DELETE | B/integration-keys/{id} | Sólo administrador: revoca la clave y responde {key}; sigue disponible con Plus vencido o proyecto congelado |

POST/DELETE requieren Idempotency-Key. El secreto de POST sólo se devuelve en la primera respuesta: su replay devuelve409 KEY_ALREADY_CREATED, sin reconstruir el secreto ni crear otra clave. Si se pierde la respuesta, listar y revocar esa clave antes de generar otra. No reintentar con una clave de idempotencia nueva para resolver un resultado desconocido.

Las claves tienen un identificador aleatorio y un secreto de256bits, se guardan como hash SHA-256 y caducan de1 a90días. La consola conserva el secreto únicamente en memoria y lo borra al salir o cambiar de proyecto. No hay endpoint de recuperación. Ningún cliente puede cambiar el plan desde estas rutas.

## Ingesta portable

POST /api/v1/ingestions/orgs/{orgId}/projects/{projectId}/releases requiere HTTPS, X-Logsofchange-Key y una Idempotency-Key estable. El cuerpo admite title (1..160), summary (hasta8000), changes (hasta30 textos de1..700) y source opcional {system,externalId,revision} (hasta80/200/160 caracteres). No se aceptan actor, roles, decisiones ni adjuntos.

La clave sólo crea un borrador privado de revisión1. El servidor fija el actor de integración y su procedencia; una persona presenta y otra decide la revisión. No existe autenticación de persona mediante esta clave, ni lectura de expedientes, aprobación o publicación automática.

La autorización comprueba el proyecto, clave activa, alcance releases:create, hash, caducidad, Plus vigente y congelación. Se repite al escribir en la transacción y antes de devolver un replay. Una revocación o vencimiento bloquea también un resultado ya registrado.

La respuesta201 contiene {release}. La misma Idempotency-Key con el mismo contenido devuelve el recibo original; otro contenido produce409. Errores:401 para credencial inválida/vencida/revocada o proyecto ajeno;403 PLUS_REQUIRED para plan no habilitado;423 WRITES_FROZEN;400 validación;413 tamaño;409 conflicto. Los servicios no registran el secreto.

El [cliente CLI](../../../cli/README.md) sólo usa módulos estándar de Node24 y lee LOGSOFCHANGE_API_KEY del entorno del proceso. La descarga del producto está en /downloads/logsofchange.mjs; no requiere npm ni acceso al repositorio. No pasar credenciales como argumento, URL o archivo de entrega. El cliente valida los tres orígenes canónicos, no sigue redirecciones y no imprime cuerpos de error del servidor.

## Publicación explícita

P representa /api/v1/publications/orgs/{orgId}/projects/{projectId}/releases. Todas las rutas exigen JWT personal, membresía activa y administrador vigente del proyecto.

| Método | Ruta | Entrada / resultado |
| --- | --- | --- |
| GET | P | {project:{slug,name}\|null,publications:[metadatos activos],nextCursor}; limit1..50 y cursor acotado al proyecto |
| POST | P/{releaseId} | {revision,slug,projectName,fields}; Idempotency-Key; publica sólo una revisión aceptada verificable |
| DELETE | P/{releaseId} | Sin cuerpo, Idempotency-Key; elimina la proyección pública de esa entrega |

POST requiere Plus vigente y escrituras abiertas. DELETE permanece disponible con Plus vencido o escrituras congeladas, mientras el administrador conserve acceso. La autorización se revalida transaccionalmente; revocar membresía bloquea también replays.

fields incluye title y puede añadir summary y changes. El servidor obtiene los campos desde el acta de la revisión aceptada, comprueba su digest y decisión, y sólo copia los campos seleccionados. No transforma un borrador o una revisión con cambios solicitados en una aprobación. La consola muestra una previsualización y explica que será visible sin iniciar sesión.

slug cumple3..64 caracteres, minúsculas, números y guiones entre segmentos. Es globalmente único y queda reservado para el mismo proyecto después de despublicar. projectName es un nombre público elegido por el administrador. Cada entrega recibe un UUID público independiente de su ID privado.

## Consulta pública y dashboard

GET /api/v1/public/projects/{slug} no requiere token. Devuelve sólo:

- project: {slug,name}.
- releases: [{id público,revision,title,summary opcional,changes opcional,acceptedAt,publishedAt}].
- nextCursor: continuación limitada al mismo slug; limit1..50.

Sin publicaciones disponibles responde404. El dashboard SSR /p/{slug} muestra únicamente esta proyección; los contadores se refieren a publicaciones consultadas, no al inventario privado del proyecto. La API de lectura no tiene permisos sobre las tablas de identidad, entregas o administración de publicaciones.

El DTO público no contiene orgId, projectId, releaseId privado, emails, sub, actor, reason, recibos, tokens, procedencia privada ni actas completas. Los textos se presentan como texto escapado, sin HTML libre ni descarga de referencias externas del servidor.

La lectura pública permite CORS sin credenciales para consultas desde otros proyectos. Las rutas privadas y la ingesta no habilitan CORS general: las claves son para procesos de servidor/CI, nunca para incluirlas en JavaScript público. La respuesta pública usa no-store y despublicar elimina futuras lecturas; no promete borrar copias que terceros ya hayan guardado.

## Operación y plan

La fila de plataforma AccessTable TENANT#org / PRODUCT controla plan, active y expiresAt (epoch opcional). Sin fila válida o con plan vencido, las capacidades están cerradas. Las personas administradoras de un cliente no tienen permiso para otorgarse Plus.

La plataforma puede revisar y asignar el plan mediante serverless/scripts/set-product-plan.mjs, con AWS ya autenticado, organización/proyecto explícitos y proyecto activo. Por defecto sólo presenta un preview; --apply=true escribe con CAS. La producción exige main y --approve-production=true. No abrir archivos de credenciales para operarlo. Las invitaciones y el alta pública siguen fuera del alcance.

## Referencias

El diseño aplica HTTPS, secretos fuera de URLs y revocación conforme a [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html). La lectura realmente pública permite CORS sin credenciales conforme a [OWASP CORS Security](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Security_Cheat_Sheet.html). Estas referencias no sustituyen las pruebas de autorización y aislamiento del producto.
