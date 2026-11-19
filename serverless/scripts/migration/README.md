# Migración histórica de Logs of Change

Estas herramientas validan una **copia JSON suministrada explícitamente** de un proyecto heredado. No conectan a MongoDB, no descubren carpetas ni archivos operativos, no consultan AWS y no insertan registros. El resultado sirve para preparar la conciliación del piloto; una validación local no autoriza el corte de tráfico ni demuestra paridad con una base real.

Desde la raíz del repositorio:

```sh
node serverless/scripts/migration/cli.mjs --input serverless/scripts/migration/fixtures/synthetic-export.json
node --test serverless/test/migration.test.mjs
```

`--validate-only` es opcional porque es el único modo. La salida es JSON por stdout. El archivo de entrada se abre con permiso de lectura y permanece intacto. Códigos de salida: `0` válido y, cuando corresponde, paridad exacta; `1` conflictos de datos o divergencia de proyección; `2` argumentos o entrada inválidos. No existe `--apply`.

## Preparar una copia de un proyecto

La fuente debe producir un sobre `legacy-export-v1` con este formato. `synthetic-export.json` es el ejemplo completo y no contiene datos de clientes.

```json
{
  "schemaVersion": "legacy-export-v1",
  "source": { "system": "legacy-mongodb", "exportId": "pilot-copy-2026-11-19" },
  "mapping": {
    "orgId": "agency-verified",
    "projectId": "pilot-project",
    "legacyProjectId": "project-source-id"
  },
  "collections": {
    "projects": [],
    "changeLogs": [],
    "logs": [],
    "logSections": [],
    "logTexts": [],
    "logMedia": [],
    "logSectionTypes": [],
    "files": [],
    "combos": []
  }
}
```

La copia debe contener exactamente el proyecto del mapeo y todas sus dependencias. Las relaciones se expresan por identificador, con las entidades en sus colecciones. Se aceptan IDs string, enteros seguros no negativos y Mongo Extended JSON `{ "$oid": "..." }`; referencias pobladas con `_id` conservan sólo ese identificador y requieren su registro en la colección correspondiente. Los ObjectId hexadecimales se normalizan a minúsculas. Los demás IDs conservan su forma, por ejemplo `"001"` difiere de `"1"`.

El exportador de la fuente, cuando se prepare, deberá usar permisos exclusivamente de lectura y una consulta acotada al proyecto verificado. Esta herramienta no incorpora credenciales ni ejecuta ese exportador. El operador debe confirmar el mapeo de organización antes de entregar una copia real; no debe incluir usuarios, suscripciones, claves de integración o tokens en el archivo de entrada.

## Validaciones y proyección

El normalizador aplica una lista de campos permitidos tomada de `src/log/types/`, `src/shared/types/` y `src/auth/types/project.type.ts`. Descarta campos desconocidos, `apiKeys`, miembros, suscripciones y datos de identidad. Las fechas presentes deben ser ISO con zona horaria o fechas Mongo Extended JSON; se comprueba el día del calendario para rechazar fechas como el 30 de febrero. Los campos imprescindibles para interpretar contenido histórico tienen comprobación de presencia y tipo.

Cada referencia debe resolver a una entidad. IDs repetidos después de normalizar, referencias huérfanas, registros no alcanzables desde el proyecto, proyectos adicionales, fechas inválidas o datos incompletos bloquean la proyección (`valid: false`, `projection: null`). Los conflictos se identifican por código, colección, ID y campo; los valores inválidos no se copian al informe.

La salida válida contiene:

- `projection.records`: entidades normalizadas, ordenadas por ID dentro de cada colección; se conserva el orden de las relaciones porque puede representar el orden editorial.
- `projection.history`: entradas con `status: "historical"`, `approved: false`, `revision: null` y `decisions: []`. No se transforma ningún dato heredado en una aprobación de Logs of Change.
- `provenance`: sistema, exportación e IDs de proyecto, changelog y entrada de origen.
- `sourceDigest`: SHA-256 de los campos normalizados, el sistema y el mapeo. No es el hash del archivo original ni incorpora secretos descartados.
- `contentDigest`: SHA-256 de cada contenido histórico; `projectionDigest` cubre la proyección completa.

La serialización canónica ordena las claves de objetos y conserva arrays (`logsofchange-canonical-json-v1`). El resultado no incluye reloj local y es reproducible con la misma copia normalizada.

Las direcciones históricas de archivos sólo son metadatos sin verificar. Se eliminan usuario, contraseña, query string y fragmento de las URLs HTTP(S); otras URL con protocolo y rutas locales absolutas se rechazan. No se descargan bytes ni se convierten esas referencias en adjuntos aceptados. `verification: "unverified-historical-reference"` mantiene visible esta distinción.

## Comparar una proyección

Guarda externamente la salida del informe o una proyección ya leída del entorno aislado y pásala de forma explícita:

```sh
node serverless/scripts/migration/cli.mjs --input copia-piloto.json --compare proyeccion-leida.json
```

`--compare` acepta la proyección directamente o un informe con propiedad `projection`. Compara todo el contenido normalizado, sus referencias, procedencia y hashes; reporta hashes y rutas divergentes, sin copiar valores del candidato. Antes del corte siguen pendientes la carga acotada a un entorno aislado, lectura del destino, conciliación con la fuente real y demostración de reversión por proyecto. No existe un selector de origen que esta herramienta pueda activar.
