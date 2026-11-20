# 04 · Comprobante de pedido desde formulario

## Para qué sirve

Cuando vendes por formulario o por WhatsApp Business con formulario, necesitas registrar cada pedido y responder al cliente con un comprobante de inmediato. Este flujo lo hace solo. Sirve a tiendas pequeñas, servicios por encargo y talleres.

**Importante:** este flujo envía un comprobante simple. No emite CFDI ni factura fiscal. La factura oficial la debe emitir tu sistema de facturación o tu contador.

## Qué hace el proceso

1. **Recibe** el pedido por webhook (nombre, email, concepto, total y RFC opcional).
2. **Normaliza** los datos: texto sin espacios, email en minúsculas, total como número, RFC en mayúsculas.
3. **Valida** que el email tenga arroba, que el total sea mayor que cero y que haya concepto.
4. Si el pedido es válido:
   - lo registra en la pestaña `Facturas` de tu hoja,
   - envía el comprobante por correo al cliente.
5. Si no es válido, avisa en `#facturacion` en Slack para que una persona lo revise. No registra nada.
6. Si algo falla, te llega una alerta.

## Piezas que usa

- Webhook.
- Edit Fields (Set).
- IF con tres condiciones.
- Google Sheets.
- Gmail.
- Slack.
- Error Trigger y Gmail.

## Antes de empezar

- Un formulario que envíe `nombre`, `email`, `concepto`, `total` y, opcionalmente, `rfc`. Puede ser Tally, Typeform, Google Forms con un script, o tu sitio web.
- Una hoja con pestaña `Facturas`.
- Canal de Slack `facturacion`.

## Cómo construirlo a mano

1. **Webhook**, método `POST`, ruta `factura-pedido-v2`, respuesta al recibir.
2. **Edit Fields (Set)** con `cliente`, `email`, `concepto`, `total` (número) y `rfc`. Lee primero `body` y luego el campo directo, con `??` para valores por defecto.
3. **IF** con: email contiene `@`, total mayor que 0, concepto no vacío.
4. Rama verdadera: **Google Sheets** (Append, pestaña `Facturas`) → **Gmail** (Send) al cliente con el resumen.
5. Rama falsa: **Slack** en `#facturacion`.
6. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Comprobante de pedido". Webhook POST en la ruta "factura-pedido-v2". Normaliza cliente, email, concepto, total (número) y rfc (mayúsculas). IF: email con "@", total mayor que 0 y concepto no vacío. Si es válido, añade fila a la pestaña "Facturas" de Google Sheets y envía al cliente por Gmail un comprobante con concepto, total y RFC, aclarando que la factura oficial llega por separado. Si no es válido, avisa en Slack canal "facturacion". Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Conecta Google Sheets, Gmail y Slack.

## Pruebas

- Envía un pedido completo con `curl` o desde el formulario. Revisa la fila y el correo.
- Envía uno con total 0. Debe llegar a Slack y no registrarse.

## Riesgos y notas

- Confirma con tu contador si el comprobante simple te basta legalmente.
- Un RFC inválido no se detecta. Puedes validar el formato con una expresión regular.
- Tiempo estimado: 1 a 2 horas.
