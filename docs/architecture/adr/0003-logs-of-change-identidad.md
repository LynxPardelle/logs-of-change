# Identidad de Logs of Change

Fecha: 2026-11-19. Estado: vigente.

El producto conserva su nombre **Logs of Change**, una referencia personal a **Wind of Change**, de Scorpions. El descriptor funcional es «Revisión de entregas y aprobaciones con evidencia». La interfaz utiliza el monograma LC y los guiños originales «Cada cambio, un rumbo claro» y «Que cada cambio encuentre su rumbo».

El identificador técnico unificado es **logsofchange**. Paquetes: logsofchange, logsofchange-services y logsofchange-web. Recursos, dominios, configuración, almacenamiento del navegador y reportes activos usan esa misma convención.

Las revisiones nuevas utilizan logsofchange.revision.v1 y las actas logsofchange.acta.v1. Se admite logs-of-change.acta.v1 como formato previo ya exportado; no se reescriben manifiestos ni hashes. La convención Git del repositorio y su carpeta siguen siendo logs-of-change porque nunca fueron el identificador provisional del entorno.

La decisión de conservar prefijos cloud provisionales ha sido sustituida por [ADR0004](0004-logsofchange-development.md): se crea un entorno con nombres definitivos, se verifica y se retira el anterior una vez comprobado que no contiene datos de negocio.

[Arquitectura](../ARCHITECTURE.md) · [Continuación remota](../../../REMOTE_HANDOFF.md).
