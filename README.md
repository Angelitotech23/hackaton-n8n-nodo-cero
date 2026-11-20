# Hackatón n8n: Nodo Cero

Quince automatizaciones para emprendedores, pensadas para construirse en **n8n Cloud** sin experiencia técnica previa. Cada una resuelve una tarea repetitiva del día a día: responder leads, ordenar correos, cobrar facturas, registrar gastos, publicar contenido, agendar citas y prospectar respetando la privacidad.

Cada carpeta de `automatizaciones/` contiene una guía completa: para qué sirve, qué hace el proceso paso a paso, cómo construirla a mano, cómo pedir su construcción a la IA de n8n Cloud, qué credenciales conectar, qué pruebas hacer y qué riesgos revisar.

Este repositorio solo contiene guías y prompts. No incluye credenciales, IDs reales ni datos personales. Los valores que debes reemplazar empiezan con `PEGAR_`.

## Catálogo

| # | Automatización | Para qué sirve | Disparador |
|---|---|---|---|
| 01 | [Captura de leads](automatizaciones/01-captura-de-leads/) | Guarda cada formulario en una hoja, avisa al equipo y da la bienvenida | Webhook |
| 02 | [Triaje de correos con IA](automatizaciones/02-triaje-de-correos-ia/) | Clasifica correos en cliente, urgente u otro y prepara borradores | Gmail, correo nuevo |
| 03 | [Recordatorio de facturas vencidas](automatizaciones/03-recordatorio-facturas/) | Envía recordatorios de cobro a tiempo | Programado, diario |
| 04 | [Comprobante de pedido](automatizaciones/04-comprobante-pedido/) | Registra pedidos y envía un comprobante simple | Webhook |
| 05 | [Extracción de facturas PDF](automatizaciones/05-extraccion-facturas-pdf/) | Pasa datos de facturas de proveedores a una hoja de gastos | Gmail con PDF |
| 06 | [Avisos de pagos Stripe](automatizaciones/06-pagos-stripe/) | Registra pagos y pide actualizar el método cuando un cobro falla | Stripe |
| 07 | [Onboarding de cliente](automatizaciones/07-onboarding-cliente/) | Crea carpeta, envía brief y abre tarea tras un pago | Stripe |
| 08 | [Publicación en LinkedIn](automatizaciones/08-publicacion-linkedin/) | Publica desde una hoja de contenido en la fecha indicada | Programado, cada hora |
| 09 | [Newsletter semanal desde RSS](automatizaciones/09-newsletter-rss/) | Envía en un correo los artículos recientes de tus fuentes | Programado, semanal |
| 10 | [Notas de reunión a tareas](automatizaciones/10-notas-reunion-tareas/) | Convierte notas en tarjetas de Trello con responsable y fecha | Webhook |
| 11 | [Reporte semanal con IA](automatizaciones/11-reporte-semanal-ia/) | Resume métricas de la semana sin inventar cifras | Programado, semanal |
| 12 | [Gastos desde recibos](automatizaciones/12-gastos-recibos/) | Registra recibos recibidos por correo en una hoja | Gmail con asunto "recibo" |
| 13 | [Atención al cliente con IA](automatizaciones/13-atencion-cliente-ia/) | Clasifica tickets y prepara borradores de respuesta | Webhook |
| 14 | [Agenda de citas](automatizaciones/14-agenda-citas/) | Crea evento, confirma y recuerda 24 horas antes | Webhook |
| 15 | [Prospección con lista propia](automatizaciones/15-prospeccion-lista-propia/) | Escribe a contactos con consentimiento, con opción de baja | Programado, días hábiles |

## Por dónde empezar

Si es tu primera automatización, empieza por **01 Captura de leads** o **03 Recordatorio de facturas**. Usan pocas piezas, no envían nada sin una acción tuya y te enseñan los conceptos base: disparador, nodos, condiciones, credenciales y manejo de errores.

## Cómo usar una guía

1. Crea una cuenta en n8n Cloud.
2. Abre la carpeta de la automatización.
3. Conecta las credenciales que indica la guía (Gmail, Google Sheets, Slack, Stripe, etc.).
4. Construye el flujo a mano siguiendo los pasos, o pega el prompt de la sección de IA en el asistente de n8n.
5. Reemplaza cada valor que empiece con `PEGAR_` por tu dato real.
6. Prueba con datos de ejemplo antes de activar.
7. Activa el flujo solo cuando las pruebas salgan bien.

## Antes de activar cualquier flujo

- **Correo y spam:** escribe solo a personas que dieron su consentimiento o con quienes tienes una relación comercial. Incluye siempre una forma de darse de baja. Revisa la ley de protección de datos de tu país (por ejemplo, LFPDPPP en México o RGPD en la Unión Europea).
- **Facturación:** los flujos de facturación envían comprobantes, no CFDI ni facturas fiscales. La factura oficial la emite tu sistema de facturación o tu contador.
- **Revisión humana:** los flujos con IA generan borradores o clasificaciones. Ningún flujo de este repositorio responde a un cliente sin revisión.
- **Pruebas:** en Stripe usa siempre el modo de prueba antes del modo real.
- **Secretos:** nunca pegues claves, tokens ni contraseñas en hojas, prompts o repositorios.

## Estructura

```
README.md
automatizaciones/
  01-captura-de-leads/README.md
  02-triaje-de-correos-ia/README.md
  03-recordatorio-facturas/README.md
  04-comprobante-pedido/README.md
  05-extraccion-facturas-pdf/README.md
  06-pagos-stripe/README.md
  07-onboarding-cliente/README.md
  08-publicacion-linkedin/README.md
  09-newsletter-rss/README.md
  10-notas-reunion-tareas/README.md
  11-reporte-semanal-ia/README.md
  12-gastos-recibos/README.md
  13-atencion-cliente-ia/README.md
  14-agenda-citas/README.md
  15-prospeccion-lista-propia/README.md
```

## Limitaciones conocidas

- Las guías describen flujos validados como borradores en n8n Cloud. Antes de usarlos en producción, haz pruebas de punta a punta con tus propias cuentas.
- Los tiempos de construcción son estimados para una primera vez.
- Algunas funciones dependen de servicios externos: LinkedIn exige una app aprobada y su token caduca cada 60 días; Stripe y Google requieren cuentas configuradas.
- Las automatizaciones con IA usan modelos de lenguaje. Pueden equivocarse, por eso siempre incluyen validación o revisión humana.

## Licencia

Sin licencia definida. Todos los derechos reservados al autor hasta que se publique una licencia.
