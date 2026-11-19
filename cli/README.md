# Logs of Change desde otro proyecto

La API HTTPS funciona desde cualquier proyecto o proveedor; no requiere una cuenta AWS. Una persona administradora de un proyecto con Plus habilitado genera una clave en la consola de Logs of Change. La clave sólo permite crear borradores privados; una persona presenta y otra revisa la entrega. Nunca se aprueba ni se publica desde CI.

Guardar la clave en el gestor de secretos del proyecto consumidor y pasarla al proceso como `LOGSOFCHANGE_API_KEY`. No incluirla en argumentos, repositorios, JSON de entrega, URLs ni logs. La consola la muestra una vez; permite revocarla y crear otra, con caducidad máxima de 90 días. No hay una suscripción cobrada automáticamente: la plataforma habilita Plus administrativamente.

Con Node.js 24, ejecutar el archivo distribuido `logsofchange.mjs`, sin dependencias:

```sh
node logsofchange.mjs --environment=production --org=mi-agencia --project=portal --file=release.json --idempotency-key=build-42
```

El JSON contiene únicamente el contenido a revisar y procedencia textual opcional:

```json
{
  "title": "Portal: entrega 42",
  "summary": "Cambios preparados para revisión humana.",
  "changes": ["Nuevo panel de seguimiento"],
  "source": { "system": "CI", "externalId": "build-42", "revision": "commit-id" }
}
```

Usar una clave de idempotencia estable por comando y repetirla con el mismo contenido ante un timeout. Cambiar el contenido exige otro comando y otra clave. El cliente envía una sola petición, mantiene TLS verificado y rechaza redirecciones/dominios alternativos. `--environment=development|testing|production` selecciona exclusivamente el dominio canónico de ese entorno; las credenciales y proyectos son independientes.

También puede invocarse directamente `POST https://logsofchange.lynxpardelle.com/api/v1/ingestions/orgs/ORG/projects/PROJECT/releases`, con `Content-Type: application/json`, `X-Logsofchange-Key` y `Idempotency-Key`. La API devuelve el borrador privado; no da acceso a decisiones o datos del proyecto mediante la clave.

Las consultas públicas usan `GET /api/v1/public/projects/SLUG` y la página `/p/SLUG`. Sólo contienen las revisiones aceptadas y campos que un administrador publicó expresamente. La API privada y las actas siguen requiriendo acceso personal al proyecto.

Este directorio puede empaquetarse con `npm pack ./cli` para distribuir el cliente. No se ha publicado un paquete en npm ni se necesita instalar dependencias globales para ejecutarlo.
