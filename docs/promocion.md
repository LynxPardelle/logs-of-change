# Promoción entre ambientes

| Ambiente de GitHub | Rama |
| --- | --- |
| development | development |
| testing | testing |
| production | main |

El trabajo nuevo llega a development. Para pasar a pruebas, abre un pull request de development a testing. Para publicar, abre un pull request de testing a main. Usa merge commit en ambas promociones para conservar el historial de integración.

La validación de origen se ejecuta con la definición del workflow del destino. Compara las ramas y el identificador del repositorio del PR, y comunica el resultado a GitHub para el commit de prueba de ese PR. Lee únicamente metadatos y no ejecuta código del origen del PR. En testing y main, el ruleset activo exige un pull request y el resultado de esa validación. Los ambientes de despliegue permiten únicamente su rama correspondiente.

Si aparece una corrección de código o de infraestructura en testing o main, impleméntala en development y sigue la cadena de promoción. Si el commit de prueba cambia, vuelve a ejecutar el workflow de promoción desde la rama de destino.

[Reglas de repositorio](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) · [Ambientes de GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
