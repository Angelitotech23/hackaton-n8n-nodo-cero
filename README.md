# Hackatón n8n: Nodo Cero

Quince automatizaciones prácticas para emprendedores, pensadas para construirse en **n8n Cloud** sin experiencia técnica previa. Cada automatización resuelve una tarea repetitiva del día a día: responder leads, ordenar correos, cobrar facturas, registrar gastos, publicar contenido, agendar citas y prospectar con respeto a la privacidad.

Este repositorio no contiene credenciales, IDs reales ni datos personales. Solo guías, prompts y plantillas.

## Qué incluye

| # | Automatización | Para qué sirve | Disparador |
|---|---|---|---|
| 01 | Captura de leads | Guardar cada formulario en una hoja, avisar al equipo y dar bienvenida | Webhook |
| 02 | Triaje de correos con IA | Clasificar correos en cliente, urgente u otro y preparar borradores | Gmail, correo nuevo |
| 03 | Recordatorio de facturas vencidas | Cobrar a tiempo con correos automáticos | Programado, diario |
| 04 | Comprobante de pedido | Registrar pedidos y enviar un comprobante simple | Webhook |
| 05 | Extracción de facturas PDF | Pasar datos de facturas de proveedores a una hoja de gastos | Gmail con PDF |
| 06 | Avisos de pagos Stripe | Registrar pagos y pedir actualizar método cuando falla un cobro | Stripe |
| 07 | Onboarding de cliente | Crear carpeta, enviar brief y abrir tarea tras un pago | Stripe |
| 08 | Publicación en LinkedIn | Publicar desde una hoja de contenido en la fecha indicada | Programado, cada hora |
| 09 | Newsletter semanal desde RSS | Enviar los artículos recientes de tus fuentes en un solo correo | Programado, semanal |
| 10 | Notas de reunión a tareas | Convertir notas en tarjetas de Trello con responsable y fecha | Webhook |
| 11 | Reporte semanal con IA | Resumir métricas de la semana sin inventar cifras | Programado, semanal |
| 12 | Gastos desde recibos | Registrar recibos recibidos por correo en una hoja | Gmail con asunto "recibo" |
| 13 | Atención al cliente | Clasificar tickets y preparar borradores de respuesta | Webhook |
| 14 | Agenda de citas | Crear evento, confirmar y recordar 24 horas antes | Webhook |
| 15 | Prospección con lista propia | Escribir a contactos con consentimiento, con opción de baja | Programado, días hábiles |

Cada automatización tiene su guía en la carpeta `guias/`, con:

- para qué sirve y a quién le sirve,
- qué hace el proceso, paso a paso,
- cómo construirla a mano en n8n,
- cómo pedirle a la IA de n8n Cloud que la construya,
- qué credenciales conectar y qué datos reemplazar,
- pruebas recomendadas y riesgos.

## Cómo usar este repositorio

1. Crea una cuenta en n8n Cloud.
2. Abre la guía de la automatización que te interese.
3. Conecta las credenciales que indica la guía (Gmail, Google Sheets, Slack, Stripe, etc.).
4. Construye el flujo a mano o pega el prompt de la guía en la IA de n8n.
5. Reemplaza cada valor que empiece con `PEGAR_` por tu dato real.
6. Prueba con datos de ejemplo antes de activar.
7. Activa el flujo solo cuando las pruebas salgan bien.

## Antes de activar cualquier flujo

- **Correo y spam:** escribe solo a personas que te dieron su consentimiento o con quienes tienes una relación comercial. Incluye siempre una forma de darse de baja. Revisa la ley de tu país (por ejemplo, LFPDPPP en México, RGPD en la Unión Europea).
- **Facturación:** las automatizaciones de facturación envían comprobantes, no CFDI ni facturas fiscales. La factura oficial la emite tu sistema de facturación o tu contador.
- **Revisión humana:** los flujos con IA generan borradores o clasificaciones. No envían respuestas sensibles sin que una persona revise.
- **Pruebas:** en Stripe usa siempre el modo de prueba antes del modo real.
- **Secretos:** nunca pegues claves, tokens ni contraseñas en la hoja, en el prompt o en un repositorio.

## Estructura del repositorio

```
README.md
guias/
  01-captura-de-leads.md
  02-triaje-de-correos-ia.md
  03-recordatorio-facturas.md
  04-comprobante-pedido.md
  05-extraccion-facturas-pdf.md
  06-pagos-stripe.md
  07-onboarding-cliente.md
  08-publicacion-linkedin.md
  09-newsletter-rss.md
  10-notas-reunion-tareas.md
  11-reporte-semanal-ia.md
  12-gastos-recibos.md
  13-atencion-cliente-ia.md
  14-agenda-citas.md
  15-prospeccion-lista-propia.md
```

## Estado

Los flujos se diseñaron y validaron en n8n Cloud como borradores. Falta conectar credenciales, reemplazar los valores `PEGAR_` y hacer pruebas de punta a punta. Algunos puntos quedan abiertos y se documentan en cada guía.

## Créditos

Proyecto creado para la Hackatón n8n: Nodo Cero.
