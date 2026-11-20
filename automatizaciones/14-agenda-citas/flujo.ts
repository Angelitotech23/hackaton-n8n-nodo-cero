import { workflow, node, trigger, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const reservaNueva = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Nueva reserva',
    parameters: { httpMethod: 'POST', path: 'reserva-cita-v2', responseMode: 'onReceived' },
  },
  output: [{ body: { nombre: 'Ana', email: 'ana@example.com', inicio: '2026-12-01T10:00:00', fin: '2026-12-01T11:00:00' } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar reserva',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'n', name: 'nombre', value: expr('{{ String($json.body?.nombre ?? "").trim() }}'), type: 'string' },
          { id: 'e', name: 'email', value: expr('{{ String($json.body?.email ?? "").trim().toLowerCase() }}'), type: 'string' },
          { id: 'i', name: 'inicio', value: expr('{{ $json.body?.inicio ?? "" }}'), type: 'string' },
          { id: 'f', name: 'fin', value: expr('{{ $json.body?.fin ?? "" }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ nombre: 'Ana', email: 'ana@example.com', inicio: '2026-12-01T10:00:00', fin: '2026-12-01T11:00:00' }]
});

const reservaValida = ifElse({
  version: 2.2,
  config: {
    name: '¿Reserva válida?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.email }}'), operator: { type: 'string', operation: 'contains' }, rightValue: '@' },
          { leftValue: expr('{{ $json.nombre }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { leftValue: expr('{{ $json.inicio }}'), operator: { type: 'dateTime', operation: 'after' }, rightValue: expr('{{ $now.toISO() }}') },
        ],
        combinator: 'and',
      },
    },
  },
});

const crearEvento = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.4,
  config: {
    name: 'Crear evento en calendario',
    parameters: {
      resource: 'event',
      operation: 'create',
      calendar: expr('{{ "PEGAR_ID_DEL_CALENDARIO" }}'),
      start: expr('{{ $json.inicio }}'),
      end: expr('{{ $json.fin }}'),
      additionalFields: { summary: expr('Cita con {{ $json.nombre }}') },
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: 'evt1' }]
});

const confirmacion = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar confirmación',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Normalizar reserva").item.json.email }}'),
      subject: 'Tu cita está confirmada',
      message: expr('Hola {{ $("Normalizar reserva").item.json.nombre }}. Tu cita es el {{ $("Normalizar reserva").item.json.inicio }}. Si necesitas cambiarla, responde a este correo.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const hayTiempoRecordatorio = ifElse({
  version: 2.2,
  config: {
    name: '¿Faltan más de 24 h?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $now.toISO() }}'), operator: { type: 'dateTime', operation: 'before' }, rightValue: expr('{{ DateTime.fromISO($("Normalizar reserva").item.json.inicio).minus({ hours: 24 }).toISO() }}') },
        ],
        combinator: 'and',
      },
    },
  },
});

const esperar = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Esperar hasta 24 h antes',
    parameters: {
      resume: 'specificTime',
      dateTime: expr('{{ DateTime.fromISO($("Normalizar reserva").item.json.inicio).minus({ hours: 24 }).toISO() }}'),
    },
  },
  output: [{}]
});

const recordatorio = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Recordatorio 24 h antes',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Normalizar reserva").item.json.email }}'),
      subject: 'Recordatorio: mañana tienes cita',
      message: expr('Hola {{ $("Normalizar reserva").item.json.nombre }}, te recordamos tu cita del {{ $("Normalizar reserva").item.json.inicio }}.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '2' }]
});

const avisoInvalida = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Reserva inválida a revisión',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#citas" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Reserva inválida o en el pasado: {{ $json.nombre }} / {{ $json.email }} / {{ $json.inicio }}'),
    },
    credentials: { slackApi: newCredential('Slack') },
    onError: 'continueRegularOutput',
  },
  output: [{ ok: true }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Agenda v2' } }]
});

const alertarFallo = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Alerta de fallo',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ "PEGAR_TU_EMAIL" }}'),
      subject: expr('Falló: {{ $json.workflow.name }}'),
      message: expr('Error: {{ $json.execution.error.message }}. Revisa la ejecución en n8n.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
  },
  output: [{ id: '1' }]
});

const nota = sticky('## Agenda v2\nReserva por webhook → normaliza → valida (email, nombre, fecha futura). Válida: evento en Calendar, confirmación, y recordatorio 24 h antes solo si aún hay tiempo. Inválida: aviso en Slack. Reemplazar PEGAR_ID_DEL_CALENDARIO y PEGAR_TU_EMAIL. El formulario debe enviar nombre, email, inicio y fin en formato ISO.', [], { color: 4 });

export default workflow('agenda-citas-v2', 'Agenda con confirmación v2')
  .add(nota)
  .add(reservaNueva)
  .to(normalizar)
  .to(reservaValida
    .onTrue(crearEvento.to(confirmacion).to(hayTiempoRecordatorio.onTrue(esperar.to(recordatorio))))
    .onFalse(avisoInvalida))
  .add(errorAlerta)
  .to(alertarFallo);
