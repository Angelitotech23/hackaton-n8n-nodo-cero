# 03 · Recordatorio automático de facturas vencidas

## Para qué sirve

Perseguir cobros es incómodo y se olvida fácil. Este flujo revisa cada día una hoja con tus facturas y manda un recordatorio amable a quien debe dinero y ya pasó la fecha de vencimiento. Sirve a freelancers, agencias, talleres o cualquier negocio que cobra después de entregar.

## Qué hace el proceso

1. **Se activa** todos los días a las 9:00.
2. **Lee** la pestaña `Facturas` de tu hoja.
3. **Normaliza** el campo `pagado` (minúsculas) y el email.
4. **Filtra** solo las facturas que cumplen las tres condiciones:
   - no están pagadas (`pagado` distinto de `si`),
   - tienen un email válido,
   - la fecha de vencimiento ya pasó.
5. **Envía** el recordatorio por Gmail con monto y fecha.
6. **Registra** el envío en la pestaña `Log recordatorios`.
7. Si no hay facturas vencidas, el flujo termina sin enviar nada.

## Piezas que usa

- Schedule Trigger (diario).
- Google Sheets (lectura y registro).
- Edit Fields (Set).
- Filter.
- Gmail.
- Error Trigger y Gmail (alertas).

## Antes de empezar

Una hoja con dos pestañas:

- `Facturas`: columnas `cliente`, `email`, `monto`, `vencimiento` (formato AAAA-MM-DD), `pagado` (`si` o `no`).
- `Log recordatorios`: columnas `fecha`, `cliente`, `monto`, `enviado`.

## Cómo construirlo a mano

1. **Schedule Trigger**, cron `0 9 * * *`.
2. **Google Sheets**, operación "Read", pestaña `Facturas`.
3. **Edit Fields (Set)** para `pagado` y `email` en minúsculas.
4. **Filter** con tres condiciones unidas por "y": `pagado` no es igual a `si`, `email` contiene `@`, `vencimiento` antes de `{{ $now.toISO() }}`.
5. **Gmail**, operación "Send", con asunto y texto que incluyan `{{ $json.monto }}` y `{{ $json.vencimiento }}`.
6. **Google Sheets**, operación "Append", pestaña `Log recordatorios`.
7. Error Trigger con alerta por correo.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Recordatorio de facturas vencidas". Schedule Trigger todos los días a las 9:00. Lee la pestaña "Facturas" de Google Sheets. Normaliza pagado y email en minúsculas. Filter: pagado distinto de "si", email que contenga "@", y vencimiento anterior a ahora. Envía por Gmail un recordatorio amable con cliente, monto y fecha de vencimiento, con continue on fail. Registra cada envío como fila en la pestaña "Log recordatorios". Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA` y `PEGAR_TU_EMAIL`.
- Conecta Google Sheets y Gmail.

## Pruebas

- Crea una factura de prueba con vencimiento de ayer, `pagado = no` y tu correo. Ejecuta el flujo manualmente. Debe llegarte el recordatorio y aparecer la fila en el log.
- Marca otra como `si`. No debe enviarse.

## Riesgos y notas

- Si una factura queda vencida varios días, el flujo la recordará cada día. Puedes agregar una condición que revise el log antes de enviar.
- El recordatorio no sustituye un acuerdo de cobro. Revisa el tono con tu cliente.
- Tiempo estimado: 1 hora.
