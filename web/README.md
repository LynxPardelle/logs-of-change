# Consola de Logs of Change

Angular standalone 22.2.6 con CLI 22.2.7 y NgRx SignalStore 22.0.1. Usa Node.js 24.15 o posterior dentro de Node.js 24. [Compatibilidad Angular](https://angular.dev/reference/versions)

Desde la raíz del repo, iniciar el backend local en una terminal.

```sh
node serverless/scripts/serve-health.mjs
```

En otra terminal, instalar el lockfile y abrir la aplicación.

```sh
cd web
npm ci
npm start
```

La consola se abre en [localhost:4200](http://localhost:4200/). La configuración de desarrollo reenvía `/api/v1/**` al backend en `127.0.0.1:3001`. También se puede exponer la plantilla con `sam local start-api --template serverless/template.yaml --port 3001` desde la raíz, cuando SAM CLI y Docker estén instalados. Usar uno de los dos servidores en ese puerto.

```sh
npm run build
npm test -- --watch=false
```

Los tests comprueban arranque, fallo, reintento y el estado que se muestra al cargar la ruta.

## Comprobación local del 17 de noviembre de 2026

La compilación de producción, las pruebas de Angular y la consulta HTTP de salud a través del proxy local pasaron en Node.js 24.22.2. `npm audit --omit=dev` devolvió cero hallazgos para las dependencias de producción. La auditoría completa reportó 12 hallazgos altos en la cadena de herramientas de desarrollo, con `picomatch@4.0.7` como dependencia transitiva. El registro publicaba esa misma versión como estable y la auditoría no ofrecía una actualización aplicable en Angular 22 para esa cadena.
