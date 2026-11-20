import { workflow, node, trigger, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const pagoConfirmado = trigger({
  type: 'n8n-nodes-base.stripeTrigger',
  version: 1,
  config: {
    name: 'Pago confirmado',
    parameters: { events: ['checkout.session.completed'] },
    credentials: { stripeApi: newCredential('Stripe') },
  },
  output: [{ id: 'cs_1', type: 'checkout.session.completed', data: { object: { customer_details: { email: 'cliente@example.com', name: 'Cliente Nuevo' }, amount_total: 500000, currency: 'mxn' } } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar cliente',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'n', name: 'nombre', value: expr('{{ String($json.data?.object?.customer_details?.name ?? "").trim() }}'), type: 'string' },
          { id: 'e', name: 'email', value: expr('{{ String($json.data?.object?.customer_details?.email ?? "").trim().toLowerCase() }}'), type: 'string' },
          { id: 'sid', name: 'sesionId', value: expr('{{ $json.id }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ nombre: 'Cliente Nuevo', email: 'cliente@example.com', sesionId: 'cs_1' }]
});

const datosOk = ifElse({
  version: 2.2,
  config: {
    name: '¿Datos del cliente completos?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.nombre }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { leftValue: expr('{{ $json.email }}'), operator: { type: 'string', operation: 'contains' }, rightValue: '@' },
        ],
        combinator: 'and',
      },
    },
  },
});

const carpeta = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Crear carpeta del cliente',
    parameters: {
      resource: 'folder',
      operation: 'create',
      name: expr('{{ $json.nombre }} - {{ $json.sesionId }}'),
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: 'folder1' }]
});

const bienvenida = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Email de bienvenida con brief',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Normalizar cliente").item.json.email }}'),
      subject: 'Bienvenido: completa tu brief',
      message: expr('Hola {{ $("Normalizar cliente").item.json.nombre }}. Gracias por tu pago. Completa tu brief aquí: PEGAR_LINK_DEL_BRIEF. Te confirmamos la fecha de inicio en 24 horas.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const tarea = node({
  type: 'n8n-nodes-base.trello',
  version: 1,
  config: {
    name: 'Tarea de inicio en Trello',
    parameters: {
      resource: 'card',
      operation: 'create',
      name: expr('Onboarding: {{ $("Normalizar cliente").item.json.nombre }}'),
      listId: expr('{{ "PEGAR_ID_DE_LISTA_TRELLO" }}'),
      additionalFields: { desc: expr('Email: {{ $("Normalizar cliente").item.json.email }}. Sesión Stripe: {{ $("Normalizar cliente").item.json.sesionId }}') },
    },
    credentials: { trelloApi: newCredential('Trello') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: 'card1' }]
});

const revisionCliente = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso: onboarding incompleto',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#onboarding" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Pago sin datos completos de cliente (sesión {{ $json.sesionId }}). Revisar en Stripe antes de onboarding.'),
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
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Onboarding v2' } }]
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

const nota = sticky('## Onboarding v2\nPago confirmado en Stripe → normaliza datos → si están completos: carpeta en Drive, bienvenida con brief y tarea en Trello; si no: aviso a Slack. Los pasos de Drive y Trello no detienen el flujo si fallan. Reemplazar PEGAR_LINK_DEL_BRIEF, PEGAR_ID_DE_LISTA_TRELLO y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('onboarding-v2', 'Onboarding de cliente v2')
  .add(nota)
  .add(pagoConfirmado)
  .to(normalizar)
  .to(datosOk
    .onTrue(carpeta.to(bienvenida.to(tarea)))
    .onFalse(revisionCliente))
  .add(errorAlerta)
  .to(alertarFallo);
