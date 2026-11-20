import { workflow, node, trigger, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const eventoStripe = trigger({
  type: 'n8n-nodes-base.stripeTrigger',
  version: 1,
  config: {
    name: 'Evento Stripe',
    parameters: { events: ['charge.succeeded', 'charge.failed'] },
    credentials: { stripeApi: newCredential('Stripe') },
  },
  output: [{ id: 'evt_1', type: 'charge.succeeded', created: 1763500000, data: { object: { id: 'ch_1', amount: 10000, currency: 'mxn', billing_details: { email: 'ana@example.com', name: 'Ana' } } } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar evento',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'id', name: 'eventoId', value: expr('{{ $json.id }}'), type: 'string' },
          { id: 'tp', name: 'tipo', value: expr('{{ $json.type }}'), type: 'string' },
          { id: 'mo', name: 'monto', value: expr('{{ ($json.data?.object?.amount ?? 0) / 100 }}'), type: 'number' },
          { id: 'mn', name: 'moneda', value: expr('{{ ($json.data?.object?.currency ?? "").toUpperCase() }}'), type: 'string' },
          { id: 'em', name: 'email', value: expr('{{ $json.data?.object?.billing_details?.email ?? "" }}'), type: 'string' },
          { id: 'nm', name: 'nombre', value: expr('{{ $json.data?.object?.billing_details?.name ?? "" }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ eventoId: 'evt_1', tipo: 'charge.succeeded', monto: 100, moneda: 'MXN', email: 'ana@example.com', nombre: 'Ana' }]
});

const esFallido = ifElse({
  version: 2.2,
  config: {
    name: '¿Pago fallido?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.tipo }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'charge.failed' }],
        combinator: 'and',
      },
    },
  },
});

const registrarPago = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Registrar pago en Sheets',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Pagos" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ eventoId: 'evt_1' }]
});

const avisoPagoOk = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso pago recibido',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#pagos" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Pago recibido: {{ $("Normalizar evento").item.json.monto }} {{ $("Normalizar evento").item.json.moneda }} de {{ $("Normalizar evento").item.json.email }}'),
    },
    credentials: { slackApi: newCredential('Slack') },
    onError: 'continueRegularOutput',
  },
  output: [{ ok: true }]
});

const emailFallido = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Pedir actualizar método de pago',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Normalizar evento").item.json.email }}'),
      subject: 'Tu pago no se pudo procesar',
      message: expr('Hola {{ $("Normalizar evento").item.json.nombre }}. Tu pago no se completó. Actualiza tu método de pago para no interrumpir tu servicio.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const avisoPagoFallido = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso pago fallido',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#pagos" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Pago fallido de {{ $("Normalizar evento").item.json.email }}. Se pidió actualizar método de pago.'),
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
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Pagos Stripe v2' } }]
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

const nota = sticky('## Pagos Stripe v2\nEvento Stripe → normaliza (monto en unidades) → si charge.failed: email al cliente y aviso; si no: registro en Pagos y aviso. Cada evento se registra con su id para rastrear duplicados. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL. Stripe puede reenviar eventos: revisa el id en Pagos antes de activar.', [], { color: 4 });

export default workflow('pagos-stripe-v2', 'Avisos de pagos Stripe v2')
  .add(nota)
  .add(eventoStripe)
  .to(normalizar)
  .to(esFallido
    .onTrue(emailFallido.to(avisoPagoFallido))
    .onFalse(registrarPago.to(avisoPagoOk)))
  .add(errorAlerta)
  .to(alertarFallo);
