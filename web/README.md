# Consola de Logs of Change

Angular standalone **22.2.6**, Angular SSR y CLI **22.2.7**, NgRx SignalStore **22.0.1**, Node.js 24. El frontend se renderiza en una Lambda de Node.js 24/ARM64 detrás de CloudFront con Function URL autenticada mediante IAM/OAC. El mismo origen público encamina `/api/v1/*` a los servicios. El adaptador usa `AngularNodeAppEngine`, Express y `serverless-http`; el artefacto incluye `server/` y `browser/`.

## Desarrollo local

Desde `web/`:

```sh
npm ci
npm start
```

El proxy de desarrollo usa `127.0.0.1:3001` para `/api/v1/**`. El backend de salud mínimo se inicia desde la raíz con `node serverless/scripts/serve-health.mjs`. Para entrar con Cognito y consultar entregas hacen falta los servicios de identidad y entregas y la configuración pública de ese entorno; el servidor de salud solo no los sustituye.

## Verificación y artefacto Lambda

```sh
cd web
npm test -- --watch=false
npm run build
npm run package:lambda
cd ..
node --test serverless/test/web-lambda.test.mjs
```

La salida de Angular queda en `web/dist/logsofchange-web/`; el empaquetador crea `serverless/.build/web/` con `index.handler` y un manifiesto SHA-256. Puede usarse como `CodeUri` de SAM o empaquetarse para Lambda. No requiere instalar las dependencias heredadas de NestJS.

`NG_ALLOWED_HOSTS` debe incluir los hosts que el SSR recibe. Si el proxy envía encabezados confiables, configurar explícitamente `NG_TRUST_PROXY_HEADERS` de acuerdo con ese proxy. Las páginas HTML usan `Cache-Control: no-store`; los assets con hash usan caché larga. Las solicitudes `/api/*` nunca reciben el HTML de la SPA desde la Lambda del frontend.

## Acceso y recorrido

La configuración pública se obtiene de `GET /api/v1/config`; contiene el entorno y los identificadores públicos de Cognito. El acceso usa Authorization Code con PKCE mediante `oidc-client-ts`, callback `/auth/callback`, validación de `state` y almacenamiento de estado OIDC en `sessionStorage`. El token de acceso también vive en la sesión del navegador; se elimina el `refresh_token` antes de guardar cualquier usuario y no se activa renovación silenciosa. El backend vuelve a verificar el token y los permisos en cada operación.

La consola carga los proyectos autorizados de `GET /api/v1/identity/me`. Permite crear un borrador, presentarlo, registrar una aceptación o pedir cambios con motivo, preparar una nueva revisión y descargar el acta JSON de una decisión. Las acciones visibles dependen del rol, pero la autorización real pertenece a los servicios. El autor de una entrega no recibe la acción de aprobarla. Todavía no hay carga de adjuntos desde la consola.

Cada mutación envía `Idempotency-Key`. Ante un fallo de transporte o del servidor, el cliente conserva la clave mientras se reintente la misma operación y el mismo cuerpo. Si cambia el proyecto, descarta respuestas antiguas para evitar mezclar información. Una sesión cerrada limpia los datos seleccionados. Los conflictos de revisión piden actualizar antes de continuar.

La verificación local cubre el contrato de salud, autenticación HTTP de las operaciones, reintento idempotente, conflicto de revisión, aislamiento del estado entre proyectos y renderizado SSR del artefacto Lambda. La aceptación completa en un navegador con una cuenta real y el corte del piloto se documentan por separado en el plan general.

## Identidad del producto

El nombre **Logs of Change** vuelve por preferencia de su autor y por la inspiración de «Wind of Change», de Scorpions. El guiño de la interfaz, «Que cada cambio encuentre su rumbo», es texto propio; no se incluyen letras, audio ni material gráfico de la canción. La infraestructura existente puede conservar identificadores técnicos anteriores sin cambiar la marca pública.
