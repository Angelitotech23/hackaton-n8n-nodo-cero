# 11 · Reporte semanal de métricas con resumen IA

## Para qué sirve

Revisar ventas, leads y cobros cada semana toma una o dos horas cuando se hace a mano, y muchos dueños lo dejan de hacer. Este flujo lee tus métricas de una hoja, compara las dos últimas semanas y manda un resumen corto por correo. Sirve a cualquier negocio que lleva números en una hoja.

## Qué hace el proceso

1. **Se activa** los lunes a las 7:00.
2. **Lee** la hoja `Métricas`, una fila por semana.
3. **Prepara** los datos de las dos últimas semanas.
4. **Revisa** que haya al menos dos semanas. Si no, avisa en `#reportes` y no manda reporte.
5. **Redacta** un resumen con IA usando solo las cifras de la hoja. Compara la última semana con la anterior y da el porcentaje de cambio.
6. **Envía** el resumen por correo.
7. Si algo falla, te llega una alerta.

## Piezas que usa

- Schedule Trigger (semanal).
- Google Sheets (lectura).
- Edit Fields (Set), con ejecución única.
- IF.
- Agente de IA con modelo DeepSeek Chat.
- Gmail.
- Slack (aviso de datos insuficientes).
- Error Trigger.

## Antes de empezar

- Hoja `Métricas` con una fila por semana. Columnas: `semana` (AAAA-MM-DD), `ventas`, `leads`, `cobros`. Ordenada de la más antigua a la más reciente.
- Canal de Slack `reportes`.

## Cómo construirlo a mano

1. **Schedule Trigger**, cron `0 7 * * 1`.
2. **Google Sheets**, operación "Read", pestaña `Métricas`.
3. **Edit Fields (Set)** con "Execute once" activado. Crea `datos` = JSON de las dos últimas filas y `filas` = número de filas. Usa `JSON.stringify($input.all().slice(-2).map(i => i.json))`.
4. **IF**: `filas` mayor o igual a 2.
5. Rama verdadera: **Agente de IA** con modelo DeepSeek Chat, temperatura 0.1. En el prompt pasa `datos`. En el system message pide un resumen en español de máximo 6 líneas, usar solo las cifras del JSON, comparar y dar el porcentaje, y no inventar.
6. Luego **Gmail** con el resumen en el cuerpo.
7. Rama falsa: **Slack** en `#reportes` avisando que faltan datos.
8. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Reporte semanal de métricas". Schedule Trigger lunes a las 7:00. Lee la pestaña "Métricas" de Google Sheets. Set con ejecución única que crea datos = JSON de las dos últimas filas y filas = número de filas. IF: filas mayor o igual a 2. Si es verdadero: agente de IA con modelo DeepSeek Chat, temperatura 0.1, y system message: resumen semanal breve en español, máximo 6 líneas, solo las cifras del JSON, compara última contra anterior con porcentaje, no inventes. Después envía el resumen por Gmail a PEGAR_TU_EMAIL. Si es falso: avisa en Slack canal "reportes" que faltan datos. Error Trigger con alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Google Sheets, Gmail, Slack, DeepSeek o créditos de IA.

## Pruebas

- Llena la hoja con dos semanas de prueba y ejecuta el flujo. Compara el resumen con tus cuentas a mano.
- Deja solo una semana. Debe llegar el aviso a Slack y no el correo.

## Riesgos y notas

- La IA redacta, no calcula. Los números salen de la hoja, pero revisa el porcentaje antes de tomar decisiones.
- Si la hoja no está ordenada por fecha, la comparación sale mal.
- Tiempo estimado: 2 horas.
