# Operación de Logs of Change

## Estado publicado

La base de aprobaciones está publicada en development, testing y producción, en https://dev.logsofchange.lynxpardelle.com, https://test.logsofchange.lynxpardelle.com y https://logsofchange.lynxpardelle.com. Sus identidades, datos y certificados son independientes, en us-east-1. Producción se publicó inicialmente mediante el PR #339, commit `a569e4ee086182a1060f93459b99c3f3d1117f38`. El incremento de integraciones y publicaciones tiene un registro separado de despliegue y pruebas por entorno. Consultar los informes de [desarrollo](development-logsofchange.md), [testing](testing-logsofchange.md) y [producción y rollout](production-logsofchange.md) para distinguir código disponible y capacidad efectivamente publicada.

## Publicar un cambio verificable

Usar Node.js 24 y los lockfiles independientes de serverless y web. Ejecutar tests de ambos, build Angular y empaquetadores. Validar `serverless/template.yaml` y `serverless/services/{identity,releases,evidence,publications}/template.yaml` con cfn-lint en us-east-1. Los artefactos generados, dependencias y outputs locales se excluyen de Git. Empaquetar antes de ejecutar los tests de Lambda para evitar omisiones por artefactos ausentes.

```sh
npm ci --prefix serverless
npm ci --prefix web
npm --prefix web test -- --watch=false
npm --prefix web run build
node serverless/scripts/package-backend.mjs
node serverless/scripts/package-web.mjs
node --test serverless/test/*.test.mjs
node serverless/scripts/deploy.mjs --environment=development
```

El script usa la sesión AWS CLI ya configurada para operar el producto, sin abrir ni escribir ficheros secretos. Los parámetros de Cognito publicados (issuer, clientId, dominio) son configuración pública, no secretos. El bucket de artefactos es privado y versionado. El incremento usa cinco stacks de servicios y uno de artefactos, con etiquetas Product/Environment: `logsofchange-<entorno>-identity`, `-releases`, `-evidence`, `-publications`, `-edge` y `-artifacts`.

Para actualizar sólo entregas: `node serverless/scripts/deploy.mjs --environment=development --service=releases`. La actualización de identidad exige comprobar compatibilidad con consumidores; la de evidencia, el contrato v1 de entregas. Evitar mutaciones manuales de Lambda que diverjan de CloudFormation.

## Promoción y retorno

El orden es development → testing → main mediante pull request y merge commit. Las correcciones detectadas en testing se implementan en development y vuelven a promoverse. Confirmar árbol limpio, HEAD remoto y CI correcta antes de empaquetar/desplegar. La rama de arquitectura prepara cambios, no modifica esas ramas automáticamente. Testing exige checkout testing y despliegue con `--environment=testing`; producción exige main y `--approve-production=true` tras revisión explícita. El script comprueba la rama antes de mutar AWS. Los dominios y datos son independientes. No apuntar producción a los usuarios ni a los datos de desarrollo.

Después de integrar el PR de promoción, obtener testing con avance rápido, ejecutar build, empaquetado y validaciones del commit promovido, y publicar:

```sh
git fetch origin
git switch testing
git pull --ff-only
git status --short --branch
node serverless/scripts/deploy.mjs --environment=testing
node serverless/scripts/environment-status.mjs --environment=testing --write-outputs
node serverless/scripts/qa-web.mjs https://test.logsofchange.lynxpardelle.com
node serverless/scripts/smoke.mjs --environment=testing
```

Conservar el trabajo local antes de cambiar de rama. `environment-status.mjs` sólo lee los stacks y escribe outputs públicos locales si se pide `--write-outputs`. Un resultado verde anterior no sustituye la CI del HEAD que se va a promover.

Producción recibe únicamente el PR de testing a main, con merge commit y check `zoo/promotion/production`. Después de la revisión de producción y con main limpio, sincronizado y validado:

```sh
node serverless/scripts/deploy.mjs --environment=production --approve-production=true
node serverless/scripts/environment-status.mjs --environment=production --write-outputs
```

El despliegue completo sigue identidad → entregas → evidencia → publicaciones → edge. La consulta de estado de este checkout espera publications y se detiene si falta su stack; no crea recursos ni reutiliza outputs de otro entorno. La base previa de producción tenía cinco stacks; completar el sexto no demuestra por sí mismo que el canary del incremento haya pasado.

Si una publicación de código falla, CloudFormation revierte su actualización. Para volver a una versión anterior que ya terminó de publicarse, recuperar el template empaquetado y los objetos S3 de esa publicación y desplegar su changeset para el mismo stack; conservar sus parámetros y revisar que no reemplace tablas/pool. Los artefactos anteriores quedan versionados en S3. No revertir datos para resolver un fallo de UI.

Si se observa un defecto de decisión después de aceptar una entrega, establecer el booleano `writesFrozen: true` en el registro `PROJECT#project` de AccessTable mediante administración controlada. Las lecturas autorizadas y el acta siguen disponibles; los comandos de entregas, ingesta, creación de claves y nueva publicación, incluidos replays de recibos, devuelven 423 WRITES_FROZEN. La condición también se comprueba dentro de la transacción. Un valor malformado bloquea escrituras; sólo false explícito o ausencia del campo permiten esos comandos. Despublicar y revocar claves siguen disponibles para administradores vigentes. Retirar membresías bloquea también lectura y escritura y se reserva para revocar acceso. Conservar revisiones/decisiones y corregir en el servicio nuevo; no transferir aprobaciones al origen heredado. Descongelar con false después de comprobar la corrección.

## Identidades y permisos del piloto

No hay alta pública ni invitaciones automáticas. El administrador designa personas verificadas en Cognito y asigna membresía y permisos explícitos en AccessTable. Un registro de membresía tiene PK TENANT#org, SK MEMBER#sub, active boolean true, orgId/orgName y actor=sub para descubrimiento. Un proyecto usa SK PROJECT#project, projectId/name/active. El permiso usa PK TENANT#org#PROJECT#project, SK PERMISSION#sub, role y active. Sólo true booleano activa acceso. No copiar API keys heredadas ni usar credenciales de integración para decidir.

Configurar al menos un editor y un revisor distintos. Comprobar acceso ajeno denegado y revocación efectiva. Las credenciales de usuarios reales no se incluyen en scripts ni reportes.

## Plan de producto y clientes externos

Free permite las aprobaciones manuales existentes. Plus activo habilita claves de integración y publicación explícita. El producto no procesa pagos ni da por cobrada una suscripción. La fila `PK=TENANT#org`, `SK=PRODUCT` de AccessTable contiene `plan`, `active` y `expiresAt` opcional en epoch; sin fila válida las capacidades Plus están cerradas. El plan afecta a la organización. El proyecto que recibe el script operativo sirve para comprobar un objetivo activo y no limita el plan a ese único proyecto.

Sólo una sesión AWS de operación de plataforma puede cambiar esa fila. Usar un perfil de plataforma ya autorizado, sin leer o copiar archivos de credenciales. Un JWT de administrador de cliente o una clave portable no puede asignar Plus. Reemplazar los IDs de ejemplo por organización y proyecto verificados; el script no crea clientes ni personas.

El modo por defecto es un preview de sólo lectura. `--apply=true` aplica mediante transacción y CAS; su rama debe coincidir con el entorno. La producción exige main y aprobación explícita, incluso para el preview:

```sh
# Preview en desarrollo: no escribe DynamoDB.
node serverless/scripts/set-product-plan.mjs --environment=development --org=mi-agencia --project=portal --plan=plus
# Aplicar sólo tras revisar el preview, desde development.
node serverless/scripts/set-product-plan.mjs --environment=development --org=mi-agencia --project=portal --plan=plus --apply=true
# Preview de producción desde main; la aprobación no sustituye --apply=true.
node serverless/scripts/set-product-plan.mjs --environment=production --org=mi-agencia --project=portal --plan=plus --approve-production=true
```

`--expires-at=SEGUNDOS_EPOCH` permite una caducidad futura. Para aplicar en producción, añadir `--apply=true` a su preview revisado. `--plan=free` desactiva Plus y no admite caducidad. No retira automáticamente publicaciones existentes: un administrador puede despublicarlas. Aunque Plus esté vencido o las escrituras congeladas, despublicar y revocar claves continúan disponibles mientras los permisos personales sigan vigentes.

Un administrador con Plus usa `/integrations` para crear claves de 1 a 90 días. El secreto se entrega una sola vez; su replay devuelve 409 KEY_ALREADY_CREATED sin revelar otra vez el secreto ni crear otra clave. Ante una respuesta perdida, listar y revocar la clave antes de crear otra. Guardarla en el gestor de secretos del proyecto consumidor e inyectar `LOGSOFCHANGE_API_KEY` al proceso CLI. No incluir claves en el JSON de entrega, URLs, argumentos, repositorio o logs.

El consumidor descarga `/downloads/logsofchange.mjs` del entorno que ya tenga este incremento desplegado y lo ejecuta con Node.js 24. No necesita AWS, npm ni dependencias. La clave sólo crea borradores privados mediante `/api/v1/ingestions/...`; no lee expedientes, presenta, decide o publica. El servidor guarda hash y metadatos, valida proyecto/alcance/vigencia/plan y repite las condiciones al escribir y antes del replay. [CLI](../../cli/README.md) · [Contrato](../architecture/contracts/integrations-public-v1.md).

## Publicación y consultas públicas

El administrador selecciona una revisión aceptada y sus campos en `/integrations`, revisa la previsualización y el aviso de acceso sin login, y publica con Idempotency-Key. La Lambda privada verifica el acta original y escribe atómicamente AdminTable y una proyección de PublicTable. El lector público sólo tiene GetItem/Query sobre PublicTable; no puede consultar permisos, entregas o recibos privados.

Compartir `/p/SLUG` o consumir `GET /api/v1/public/projects/SLUG`. Las páginas aceptan `limit` de 1 a 50 y un cursor acotado al slug. La API pública permite CORS sin credenciales; no copiar esta política a los endpoints privados o de ingesta. Se devuelven nombre público, UUID público, revisión, título, campos opcionales seleccionados y fechas. No se publican actores, motivos, IDs privados, procedencia o actas completas. Los contadores del dashboard representan sólo las publicaciones consultadas.

Despublicar elimina la fila de la revisión pública y las siguientes consultas dejan de devolverla. Con la última publicación retirada, el GET público responde 404. La reserva del slug, el mapping administrativo y los recibos permanecen privados para conservar continuidad e idempotencia; no se ofrece borrar copias externas. Las respuestas usan no-store y CloudFront mantiene caché desactivada.

## Salud, logs y diagnóstico

Consultar `/api/v1/health` y `/api/v1/config` por el dominio público; las rutas personales de identidad/entregas/evidencia/publicaciones deben devolver 401 sin token. La ingesta exige su clave y la lectura pública permite consulta anónima sólo de proyecciones publicadas. Salud sólo comprueba edge, no certifica los datos ni los otros servicios. CloudWatch separa logs por servicio con 14 días de retención y no registra cuerpos ni tokens. Revisar Errors, Duration, Throttles y respuestas 5xx antes de promover; fijar umbrales y destinatarios conforme a la operación real del piloto.

Una descarga 409 indica que no existe decisión; 502 INTEGRITY_MISMATCH bloquea un acta inconsistente. Un 403 puede indicar permiso revocado o Plus no habilitado; 409 requiere refrescar versión o repetir exactamente con la misma Idempotency-Key. No generar una clave nueva ni cambiar de credencial para reintentar una petición cuyo resultado se desconoce.

## Recuperación y migración

PITR está habilitado en las tablas. Restaurar siempre a una tabla nueva, comprobar conteos/manifiestos/decisiones y aislamiento antes de modificar un parámetro de servicio. Mantener la original protegida; conservar historial de recibos para que un restore no reabra operaciones ya confirmadas. Una recuperación sintética no autoriza un corte real. Las políticas de retención comercial y requisitos WORM aún necesitan definición antes de ofrecer garantías contractuales.

La herramienta de migración sólo lee un JSON explícito. Primero validate-only, luego compare contra una proyección de la misma exportación. Para un piloto real documentar fuente, autorización de lectura, proyecto, mapeo organizacional, hashes y conciliación. No se aplica al DynamoDB de negocio automáticamente. La historia importada es histórica, no aprobada.

## Smoke sintético

`node serverless/scripts/smoke.mjs --environment=development` y `--environment=testing` usan exclusivamente los outputs del entorno indicado y validan su dominio y prefijos de tablas antes de escribir. Generan identidades/datos únicos de prueba. Las credenciales viven en memoria y los usuarios se crean con mensajes suprimidos. Prueban OAuth real y el flujo a través de CloudFront: creación y presentación, solicitud de cambios, nueva revisión, aceptación y descarga de actas, conservando la evidencia anterior. Limpian sólo los datos y usuarios del ámbito sintético. El reporte local excluye tokens y contraseñas y no representa aceptación de un piloto real.

`qa-web.mjs` admite las URLs canónicas de development/testing, comprueba escritorio y móvil, salud/configuración y redirección Code+PKCE, y guarda reportes/capturas separados en `.deployment/<entorno>/browser-qa`. Requiere Chrome/Edge instalado o `LOGSOFCHANGE_BROWSER_PATH`; `LOGSOFCHANGE_BROWSER_CHANNEL` permite seleccionar un canal instalado. Las salidas del smoke también quedan bajo `.deployment/<entorno>/`. La recuperación sintética con `--restore=true` está restringida a development; testing la rechaza. Consultar los informes de [desarrollo](development-logsofchange.md) y [testing](testing-logsofchange.md) para el alcance de lo ejecutado.

El incremento añade un canary de producto al tenant UUID del smoke: Plus sintético, creación de clave por API, invocación del CLI con secreto sólo en memoria, revisión humana, publicación, lectura pública sin token, despublicación y revocación. Limpiar usuarios, acceso y datos de entregas, más la partición administrativa, claim de slug y proyección pública derivados de ese mismo UUID. No usar scans ni borrar particiones ajenas para limpiar una prueba. Verificar tanto el resultado del flujo como los contadores de limpieza y las lecturas posteriores.

La base de producción se verificó con un harness operativo local aprobado explícitamente, con main, cuenta y recursos propios validados y restore prohibido. Los entrypoints genéricos mantienen su restricción a development/testing. El [informe de producción](production-logsofchange.md) registra qué runner y revisión se ejecutaron; no retirar guardas para repetir una prueba en producción.

Si npm en Windows informa UNABLE_TO_VERIFY_LEAF_SIGNATURE por la cadena local de certificados, ejecutar en ese proceso con `NODE_OPTIONS=--use-system-ca` y mantener la verificación TLS activada. No cambiar strict-ssl.

## Retiro de un entorno de desarrollo vacío sustituido

La herramienta `serverless/scripts/retire-empty-environment.mjs` recibe dos inventarios JSON explícitos dentro de la ruta ignorada `.deployment/migration-logsofchange/`: origen y reemplazo. Por defecto sólo presenta un plan de lectura. Rechaza testing/production, cuenta o región distintas, nombres/ARN ajenos, un reemplazo incompleto o cualquier usuario, fila o versión de evidencia en el origen.

Sólo después de verificar sitio y flujo del reemplazo, `--apply` permite retirar los stacks exactos anteriores y sus recursos retenidos todavía vacíos. Repite la comprobación de datos, desactiva la protección únicamente de una tabla antigua identificada y vacía, purga versiones de artefactos sólo en su bucket exclusivo y elimina únicamente los logs y el CNAME de validación inventariados. Un fallo detiene el proceso y conserva un reporte de progreso sin credenciales. El historial Git conserva las verificaciones anteriores; el entorno activo usa el nombre definitivo logsofchange.

La conservación y el retiro de recursos con política Retain siguen la [documentación de CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html). El retiro de la distribución espera a que AWS complete su desactivación y borrado; no afecta a la distribución del reemplazo.
