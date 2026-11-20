# 06 · Avisos de pagos Stripe: exitoso y fallido

## Para qué sirve

Si cobras con Stripe, quieres enterarte al instante de cada pago y actuar cuando uno falla. Este flujo registra los pagos en una hoja, avisa en Slack cuando entra dinero y, si un cobro falla, le escribe al cliente para que actualice su método de pago. Sirve a suscripciones, cursos, membresías y tiendas en línea.

## Qué hace el proceso

1. **Escucha** eventos de Stripe: `charge.succeeded` y `charge.failed`.
2. **Normaliza** el evento: id, tipo, monto (Stripe lo manda en centavos, así que se divide entre 100), moneda, email y nombre.
3. **Decide** según el tipo de evento:
   - **Fallido:** envía un correo al cliente pidiendo actualizar su método de pago y avisa en `#pagos`.
   - **Exitoso:** registra la fila en `Pagos` y avisa en `#pagos`.
4. Si algo falla, te llega una alerta.

## Piezas que usa

- Stripe Trigger.
- Edit Fields (Set), con conversión de centavos.
- IF (tipo de evento).
- Google Sheets.
- Slack.
- Gmail.
- Error Trigger y Gmail.

## Antes de empezar

- Cuenta de Stripe. Empieza en **modo de prueba** (test mode).
- Hoja con pestaña `Pagos`: `eventoId`, `tipo`, `monto`, `moneda`, `email`, `nombre`, `recibido`.
- Canal de Slack `pagos`.

## Cómo construirlo a mano

1. **Stripe Trigger**, eventos `charge.succeeded` y `charge.failed`.
2. **Edit Fields (Set)** con:
   - `eventoId` = `{{ $json.id }}`
   - `tipo` = `{{ $json.type }}`
   - `monto` = `{{ ($json.data?.object?.amount ?? 0) / 100 }}`
   - `moneda` = mayúsculas de la moneda
   - `email` y `nombre` desde `data.object.billing_details`.
3. **IF**: `tipo` es igual a `charge.failed`.
4. Rama verdadera: **Gmail** con el aviso al cliente → **Slack** en `#pagos`.
5. Rama falsa: **Google Sheets** (Append, `Pagos`) → **Slack** en `#pagos`.
6. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Avisos de pagos Stripe". Stripe Trigger con eventos charge.succeeded y charge.failed. Set que normaliza: eventoId (id), tipo (type), monto (amount dividido entre 100), moneda en mayúsculas, email y nombre desde data.object.billing_details. IF: si tipo es charge.failed, envía a Gmail al cliente un correo pidiendo actualizar su método de pago y avisa en Slack canal "pagos". Si no, añade fila a la pestaña "Pagos" de Google Sheets y avisa en Slack canal "pagos". Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- Conecta Stripe en modo de prueba (clave de prueba y secreto del webhook que n8n genera).
- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Slack, Gmail y Google Sheets.

## Pruebas

- En Stripe, usa tarjetas de prueba. Una exitosa y una que se rechace (por ejemplo, la tarjeta de prueba de fondos insuficientes).
- Revisa la fila en `Pagos` y el aviso en Slack para el pago exitoso.
- Revisa el correo y el aviso para el fallido.

## Riesgos y notas

- Stripe puede reenviar eventos. Antes de activar, agrega una búsqueda por `eventoId` en la hoja para no registrar dos veces el mismo pago.
- El correo de cobro fallido debe ser amable y no amenazante.
- No actives el modo real hasta probar todo en modo de prueba.
- Tiempo estimado: 2 horas.
