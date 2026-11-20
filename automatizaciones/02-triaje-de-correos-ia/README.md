# 02 · Triaje de correos con IA

## Para qué sirve

Muchos emprendedores pasan horas cada día separando correos de clientes, proveedores y asuntos urgentes. Este flujo lee cada correo no leído, lo clasifica con IA y lo ordena: los de clientes reciben un borrador de respuesta, los urgentes se avisan en Slack y el resto va a una revisión manual. Nunca envía respuestas por su cuenta.

## Qué hace el proceso

1. **Detecta** un correo nuevo no leído en Gmail (revisa cada minuto).
2. **Normaliza** el asunto, el remitente y un extracto del texto, con un máximo de 800 caracteres.
3. **Clasifica** con un agente de IA (modelo DeepSeek chat, temperatura baja). La IA responde solo JSON con una categoría: `cliente`, `proveedor`, `urgente` u `otro`, y un motivo corto.
4. **Enruta** con un nodo Switch:
   - `cliente` → crea un **borrador** en Gmail con una respuesta de cortesía.
   - `urgente` → avisa en el canal `#urgentes` de Slack.
   - cualquier otra cosa → avisa en `#revision` para que una persona lo vea.
5. **Marca el correo como leído**, para que no se procese dos veces.
6. Si algo falla, te llega una alerta por correo.

## Piezas que usa

- Gmail Trigger (correo no leído).
- Edit Fields (Set) para normalizar.
- Agente de IA con modelo DeepSeek Chat.
- Switch con ruta de respaldo.
- Gmail (borrador y marcar como leído).
- Slack (urgentes y revisión).
- Error Trigger y Gmail (alertas).

## Antes de empezar

- Gmail conectado.
- Cuenta de DeepSeek o créditos de IA de n8n Cloud.
- Canales de Slack: `urgentes` y `revision`.
- Tu correo para alertas.

## Cómo construirlo a mano

1. Añade un **Gmail Trigger** con filtro "solo no leídos".
2. Añade **Edit Fields (Set)** con: `asunto` (asunto recortado), `remitente` (en minúsculas) y `extracto` (primeros 800 caracteres del texto).
3. Añade un **Agente de IA**. En "Prompt" escribe el asunto, el remitente y el extracto. En "System message" escribe: clasifica el correo en exactamente una de estas categorías: cliente, proveedor, urgente u otro; responde solo JSON con `categoria` y `motivo` de máximo 15 palabras.
4. En el agente, conecta un nodo **DeepSeek Chat Model** como modelo. Usa el modelo `deepseek-chat` y temperatura 0.1.
5. Añade un **Switch** sobre la salida del agente:
   - caso 0: contiene "cliente",
   - caso 1: contiene "urgente",
   - opción "fallback" activada con nombre "Otro".
6. Caso 0: **Gmail** en modo "Draft / Create" con asunto `Re: ...` y un texto de cortesía.
7. Caso 1: **Slack** en `#urgentes`.
8. Fallback: **Slack** en `#revision`.
9. Conecta los tres caminos a **Gmail** "Mark as read" usando el id del correo original.
10. Añade un **Error Trigger** y una alerta por correo.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Triaje de correos con IA". Gmail Trigger de correos no leídos cada minuto. Normaliza asunto (recortado), remitente (minúsculas) y extracto (800 caracteres). Agente de IA con modelo DeepSeek Chat, temperatura 0.1, y system message: clasifica en cliente, proveedor, urgente u otro; responde solo JSON con categoria y motivo. Switch: si contiene "cliente" crea un borrador de Gmail con respuesta de cortesía a remitente; si contiene "urgente" avisa en Slack canal "urgentes"; si no, fallback que avisa en Slack canal "revision". Los tres caminos terminan en marcar el correo como leído. Error Trigger que envía correo a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_TU_EMAIL`.
- Canales de Slack: `#urgentes` y `#revision`. Crea los canales o cámbialos.
- Gmail, Slack y DeepSeek (o créditos de IA de n8n).

## Pruebas

- Envía un correo tuyo con asunto "Quiero cotizar". Debe crear un borrador.
- Envía uno con "URGENTE: no funciona mi pedido". Debe llegar a `#urgentes`.
- Envía uno de publicidad. Debe llegar a `#revision`.
- Verifica que el correo original quede marcado como leído.

## Riesgos y notas

- La IA puede equivocarse. Por eso el flujo solo crea borradores y avisos.
- El texto del borrador es fijo. Puedes mejorarlo con un segundo agente que lo personalice.
- Tiempo estimado: 1 a 2 horas la primera vez.
