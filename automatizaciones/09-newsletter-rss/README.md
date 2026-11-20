# 09 · Newsletter semanal desde RSS

## Para qué sirve

Si publicas un boletín, la parte más lenta es buscar qué compartir. Este flujo toma los artículos recientes de un feed RSS (blogs, medios, canales de YouTube que tienen RSS) y los manda en un solo correo cada semana. Sirve a creadores de contenido, boletines de nicho y equipos que quieren mantenerse al día.

## Qué hace el proceso

1. **Se activa** cada lunes a las 8:00.
2. **Lee** el feed RSS indicado.
3. **Filtra** los artículos publicados en los últimos 7 días.
4. **Arma** un solo correo con título y enlace de cada artículo.
5. **Envía** el correo a tu lista o a tu propio correo.
6. Si no hay artículos nuevos, no envía nada.

## Piezas que usa

- Schedule Trigger (semanal).
- RSS Feed Read.
- Filter (fecha).
- Gmail (envío del correo con todos los artículos juntos).
- Error Trigger y Gmail.

## Antes de empezar

- Una URL de feed RSS. La mayoría de blogs la tienen en `/feed` o `/rss`.
- Un correo de envío (Gmail) o una lista en Mailchimp o Brevo.

## Cómo construirlo a mano

1. **Schedule Trigger**, cron `0 8 * * 1`.
2. **RSS Feed Read**, con la URL del feed.
3. **Filter**: `pubDate` después de `{{ $now.minus({ days: 7 }).toISO() }}`.
4. **Gmail**, operación "Send", con asunto "Boletín semanal" y mensaje que une todos los títulos y enlaces con `{{ $input.all().map(i => i.json.title + " - " + i.json.link).join("\n") }}`.
5. En la configuración del nodo Gmail, activa **"Execute once"**. Así el correo sale una sola vez aunque haya varios artículos.
6. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Newsletter semanal desde RSS". Schedule Trigger lunes a las 8:00. RSS Feed Read sobre PEGAR_URL_RSS_1. Filter: pubDate posterior a hace 7 días. Gmail envía un solo correo, con execute once activado, asunto "Boletín semanal" y cuerpo con título y enlace de cada artículo, unidos en líneas, al destinatario PEGAR_EMAIL_O_LISTA. Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_URL_RSS_1`, `PEGAR_EMAIL_O_LISTA`, `PEGAR_TU_EMAIL`.
- Gmail.

## Pruebas

- Ejecuta el flujo manualmente. Debe llegarte un correo con los artículos de la última semana.
- Cambia el filtro a 365 días para probar con más artículos y vuelve a 7 después.

## Riesgos y notas

- Revisa los derechos del contenido que compartes. Cita siempre la fuente y no copies textos completos.
- Esta versión no resume con IA. Si quieres resúmenes, añade un agente de IA después del filtro.
- Gmail tiene límites de envío diario. Para listas grandes usa Mailchimp o Brevo.
- Tiempo estimado: 1 hora.
