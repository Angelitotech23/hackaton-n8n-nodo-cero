# 13 · Atención al cliente: clasificación y borrador con IA

## Para qué sirve

Los mensajes de clientes llegan a todas horas y mezclan dudas, quejas, urgencias y oportunidades de venta. Este flujo recibe cada ticket, lo clasifica con IA, redacta un borrador de respuesta y registra todo en una hoja. Si el caso es urgente, avisa en Slack. La IA nunca responde al cliente por sí sola: el borrador queda para que tú lo revises. Sirve a tiendas, servicios y cualquier negocio con atención por formulario.

## Qué hace el proceso

1. **Recibe** el ticket por webhook (nombre, email y mensaje).
2. **Normaliza** los campos y recorta el mensaje a 4 000 caracteres.
3. **Clasifica y redacta** con un agente de IA (DeepSeek Chat). La IA responde JSON con `categoria` (duda, queja, urgente o venta) y un `borrador` de respuesta. La regla: sin prometer plazos ni reembolsos.
4. **Lee** la respuesta con un nodo Code. Si el JSON está mal, marca la categoría como "sin clasificar".
5. **Registra** el ticket en la pestaña `Tickets` con el borrador incluido.
6. Si es urgente, avisa en `#soporte-urgente`.

## Piezas que usa

- Webhook.
- Edit Fields (Set).
- Agente de IA con DeepSeek Chat.
- Code.
- Google Sheets.
- IF.
- Slack.
- Error Trigger y Gmail.

## Antes de empezar

- Hoja con pestaña `Tickets`: `recibido`, `nombre`, `email`, `mensaje`, `categoria`, `borrador`.
- Canal de Slack `soporte-urgente`.
- Un formulario de contacto que envíe `nombre`, `email` y `mensaje` al webhook.

## Cómo construirlo a mano

1. **Webhook**, `POST`, ruta `soporte-ticket-v2`.
2. **Edit Fields (Set)**: `nombre`, `email` en minúsculas, `mensaje` recortado a 4 000 caracteres.
3. **Agente de IA**, modelo DeepSeek Chat, temperatura 0.2. System message: clasifica en duda, queja, urgente o venta; escribe un borrador corto y amable sin prometer plazos ni reembolsos; responde solo JSON con `categoria` y `borrador`. Urgente incluye: no puede entrar, cobro incorrecto, problema de seguridad o pérdida de servicio.
4. **Code**: quita fences, parsea en `try/catch`, combina con los datos normalizados.
5. **Google Sheets**, Append, pestaña `Tickets`.
6. **IF**: `categoria` igual a `urgente`. Si es verdadero, **Slack** en `#soporte-urgente`.
7. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Atención al cliente con borrador IA". Webhook POST en "soporte-ticket-v2". Set con nombre, email en minúsculas y mensaje recortado a 4000 caracteres. Agente de IA con modelo DeepSeek Chat, temperatura 0.2, y system message: clasifica en duda, queja, urgente o venta; escribe un borrador corto y amable que no prometa plazos ni reembolsos; responde solo JSON con categoria y borrador; urgente es no poder entrar, cobro incorrecto, seguridad o pérdida de servicio. Code que parsea el JSON con try/catch y une con los datos. Añade fila a la pestaña "Tickets" de Google Sheets. IF: categoria igual a urgente, y si es verdadero avisa en Slack canal "soporte-urgente". Nunca envía respuesta al cliente. Error Trigger con alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Google Sheets, Slack, DeepSeek o créditos de IA.

## Pruebas

- Envía tres tickets de prueba: una duda, una queja urgente y una venta. Revisa la hoja y el aviso en Slack.
- Revisa que el borrador no prometa nada que no puedas cumplir.

## Riesgos y notas

- Los borradores deben revisarse siempre antes de enviarse.
- Un cliente enojado puede recibir una respuesta tibia. Ajusta el tono en el system message.
- Si quieres responder solo, eso exige un paso de aprobación humana. No lo actives sin revisión.
- Tiempo estimado: 2 horas.
