# Operación de Logs of Change

## Estado publicado

Development está publicado en https://dev.logsofchange.lynxpardelle.com y testing en https://test.logsofchange.lynxpardelle.com. Ambos tienen stacks, identidades, datos y certificados propios en us-east-1. La promoción development → testing se hizo por PR con merge commit; main permanece sin cambios y producción sigue pendiente. Los resultados constan en los informes de [desarrollo](development-logsofchange.md) y [testing](testing-logsofchange.md).

## Publicar un cambio verificable

Usar Node.js24 y los lockfiles independientes de serverless y web. Ejecutar tests de ambos, build Angular y empaquetadores. Validar `serverless/template.yaml` y `serverless/services/{identity,releases,evidence}/template.yaml` con cfn-lint en us-east-1. Los artefactos generados, dependencias y outputs locales se excluyen de Git.

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

El script usa las credenciales que AWS CLI ya tiene configuradas, sin abrir ni escribir ficheros secretos. Los parámetros de Cognito publicados (issuer, clientId, dominio) son configuración pública, no secretos. El bucket de artefactos es privado y versionado. Un entorno usa cuatro stacks de servicios y un stack de artefactos, con etiquetas Product/Environment.

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

Si una publicación de código falla, CloudFormation revierte su actualización. Para volver a una versión anterior que ya terminó de publicarse, recuperar el template empaquetado y los objetos S3 de esa publicación y desplegar su changeset para el mismo stack; conservar sus parámetros y revisar que no reemplace tablas/pool. Los artefactos anteriores quedan versionados en S3. No revertir datos para resolver un fallo de UI.

Si se observa un defecto de decisión después de aceptar una entrega, establecer el booleano `writesFrozen: true` en el registro `PROJECT#project` de AccessTable mediante administración controlada. Las lecturas autorizadas y el acta siguen disponibles; todos los comandos, incluidos replays de recibos, devuelven423 WRITES_FROZEN. La condición también se comprueba dentro de la transacción. Un valor malformado bloquea escrituras; sólo false explícito o ausencia del campo permiten comandos. Retirar membresías sigue bloqueando tanto lectura como escritura y se reserva para revocar acceso, no para congelar sólo comandos. Conservar revisiones/decisiones y corregir en el servicio nuevo; no transferir esas aprobaciones al origen heredado. Descongelar con false después de comprobar la corrección.

## Identidades y permisos del piloto

No hay alta pública ni invitaciones automáticas. El administrador designa personas verificadas en Cognito y asigna membresía y permisos explícitos en AccessTable. Un registro de membresía tiene PK TENANT#org, SK MEMBER#sub, active boolean true, orgId/orgName y actor=sub para descubrimiento. Un proyecto usa SK PROJECT#project, projectId/name/active. El permiso usa PK TENANT#org#PROJECT#project, SK PERMISSION#sub, role y active. Sólo true booleano activa acceso. No copiar API keys heredadas ni usar credenciales de integración para decidir.

Configurar al menos un editor y un revisor distintos. Comprobar acceso ajeno denegado y revocación efectiva. Las credenciales de usuarios reales no se incluyen en scripts ni reportes.

## Salud, logs y diagnóstico

Consultar `/api/v1/health` y `/api/v1/config` por el dominio público; identidad/entregas/evidencia deben devolver401 sin token. Salud sólo comprueba el proceso edge, no certifica los datos ni los otros servicios. CloudWatch separa logs por servicio con14 días de retención y no registra cuerpos ni tokens. Revisar Errors, Duration, Throttles y respuestas5xx de cada API antes de promover; fijar umbrales y destinatarios de alertas conforme a la operación real del piloto.

Una descarga409 indica que no existe decisión;502 INTEGRITY_MISMATCH bloquea un acta inconsistente. Un403 de entregas puede indicar permiso revocado;409 requiere refrescar versión o repetir exactamente con la misma Idempotency-Key. No generar una clave nueva para reintentar una petición cuyo resultado se desconoce.

## Recuperación y migración

PITR está habilitado en las tablas. Restaurar siempre a una tabla nueva, comprobar conteos/manifiestos/decisiones y aislamiento antes de modificar un parámetro de servicio. Mantener la original protegida; conservar historial de recibos para que un restore no reabra operaciones ya confirmadas. Una recuperación sintética no autoriza un corte real. Las políticas de retención comercial y requisitos WORM aún necesitan definición antes de ofrecer garantías contractuales.

La herramienta de migración sólo lee un JSON explícito. Primero validate-only, luego compare contra una proyección de la misma exportación. Para un piloto real documentar fuente, autorización de lectura, proyecto, mapeo organizacional, hashes y conciliación. No se aplica al DynamoDB de negocio automáticamente. La historia importada es histórica, no aprobada.

## Smoke sintético

`node serverless/scripts/smoke.mjs --environment=development` y `--environment=testing` usan exclusivamente los outputs del entorno indicado y validan su dominio y prefijos de tablas antes de escribir. Generan identidades/datos únicos de prueba. Las credenciales viven en memoria y los usuarios se crean con mensajes suprimidos. Prueban OAuth real y el flujo a través de CloudFront: creación y presentación, solicitud de cambios, nueva revisión, aceptación y descarga de actas, conservando la evidencia anterior. Limpian sólo los datos y usuarios del ámbito sintético. El reporte local excluye tokens y contraseñas y no representa aceptación de un piloto real.

`qa-web.mjs` admite las URLs canónicas de development/testing, comprueba escritorio y móvil, salud/configuración y redirección Code+PKCE, y guarda reportes/capturas separados en `.deployment/<entorno>/browser-qa`. Requiere Chrome/Edge instalado o `LOGSOFCHANGE_BROWSER_PATH`; `LOGSOFCHANGE_BROWSER_CHANNEL` permite seleccionar un canal instalado. Las salidas del smoke también quedan bajo `.deployment/<entorno>/`. La recuperación sintética con `--restore=true` está restringida a development; testing la rechaza. Consultar los informes de [desarrollo](development-logsofchange.md) y [testing](testing-logsofchange.md) para el alcance de lo ejecutado.

Si npm en Windows informa UNABLE_TO_VERIFY_LEAF_SIGNATURE por la cadena local de certificados, ejecutar en ese proceso con `NODE_OPTIONS=--use-system-ca` y mantener la verificación TLS activada. No cambiar strict-ssl.

## Retiro de un entorno de desarrollo vacío sustituido

La herramienta `serverless/scripts/retire-empty-environment.mjs` recibe dos inventarios JSON explícitos dentro de la ruta ignorada `.deployment/migration-logsofchange/`: origen y reemplazo. Por defecto sólo presenta un plan de lectura. Rechaza testing/production, cuenta o región distintas, nombres/ARN ajenos, un reemplazo incompleto o cualquier usuario, fila o versión de evidencia en el origen.

Sólo después de verificar sitio y flujo del reemplazo, `--apply` permite retirar los stacks exactos anteriores y sus recursos retenidos todavía vacíos. Repite la comprobación de datos, desactiva la protección únicamente de una tabla antigua identificada y vacía, purga versiones de artefactos sólo en su bucket exclusivo y elimina únicamente los logs y el CNAME de validación inventariados. Un fallo detiene el proceso y conserva un reporte de progreso sin credenciales. El historial Git conserva las verificaciones anteriores; el entorno activo usa el nombre definitivo logsofchange.

La conservación y el retiro de recursos con política Retain siguen la [documentación de CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html). El retiro de la distribución espera a que AWS complete su desactivación y borrado; no afecta a la distribución del reemplazo.
