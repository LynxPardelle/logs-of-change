# Promoción entre ambientes

| Ambiente de GitHub | Rama |
| --- | --- |
| development | development |
| testing | testing |
| production | main |

El trabajo nuevo llega a development. Para pasar a pruebas, abre un pull request de development a testing. Para publicar, abre un pull request de testing a main. Usa merge commit en ambas promociones para conservar el historial de integración.

La validación de origen se ejecuta con la definición del workflow del destino. Compara las ramas y el identificador del repositorio del PR, y GitHub Actions publica el check obligatorio asociado al PR. Lee únicamente metadatos y no ejecuta código del origen del PR. En testing y main, el ruleset activo exige un pull request y el resultado de esa validación. Los ambientes de despliegue permiten únicamente su rama correspondiente.

Si aparece una corrección de código o de infraestructura en testing o main, impleméntala en development y sigue la cadena de promoción. Al actualizar el PR, GitHub vuelve a validar su origen. Para repetir la comprobación se puede volver a ejecutar el trabajo del PR desde la pestaña Checks.

[Reglas de repositorio](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) · [Ambientes de GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
