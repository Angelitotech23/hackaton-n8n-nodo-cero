import { workflow, node, trigger, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const nuevoPedido = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Nuevo pedido',
    parameters: { httpMethod: 'POST', path: 'factura-pedido-v2', responseMode: 'onReceived' },
  },
  output: [{ body: { cliente: 'Ana', email: 'ana@example.com', concepto: 'Consultoría', total: 100, rfc: 'XAXX010101000' } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar pedido',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'c', name: 'cliente', value: expr('{{ String($json.body?.cliente ?? $json.cliente ?? "").trim() }}'), type: 'string' },
          { id: 'e', name: 'email', value: expr('{{ String($json.body?.email ?? $json.email ?? "").trim().toLowerCase() }}'), type: 'string' },
          { id: 'k', name: 'concepto', value: expr('{{ String($json.body?.concepto ?? $json.concepto ?? "").trim() }}'), type: 'string' },
          { id: 't', name: 'total', value: expr('{{ Number($json.body?.total ?? $json.total ?? 0) }}'), type: 'number' },
          { id: 'r', name: 'rfc', value: expr('{{ String($json.body?.rfc ?? $json.rfc ?? "").trim().toUpperCase() }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ cliente: 'Ana', email: 'ana@example.com', concepto: 'Consultoría', total: 100, rfc: 'XAXX010101000' }]
});

const pedidoValido = ifElse({
  version: 2.2,
  config: {
    name: '¿Pedido válido?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.email }}'), operator: { type: 'string', operation: 'contains' }, rightValue: '@' },
          { leftValue: expr('{{ $json.total }}'), operator: { type: 'number', operation: 'gt' }, rightValue: 0 },
          { leftValue: expr('{{ $json.concepto }}'), operator: { type: 'string', operation: 'notEmpty' } },
        ],
        combinator: 'and',
      },
    },
  },
});

const registrar = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Registrar factura en Sheets',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Facturas" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ cliente: 'Ana', total: 100 }]
});

const enviar = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar comprobante al cliente',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Normalizar pedido").item.json.email }}'),
      subject: expr('Tu comprobante de pedido por {{ $("Normalizar pedido").item.json.total }}'),
      message: expr('Hola {{ $("Normalizar pedido").item.json.cliente }}. Concepto: {{ $("Normalizar pedido").item.json.concepto }}. Total: {{ $("Normalizar pedido").item.json.total }}. RFC: {{ $("Normalizar pedido").item.json.rfc }}. La factura oficial llegará por separado.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const revisionPedido = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Pedido incompleto a revisión',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#facturacion" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Pedido incompleto, no se facturó: {{ $json.cliente }} / {{ $json.email }} / total {{ $json.total }}'),
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
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Factura v2' } }]
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

const nota = sticky('## Factura automática v2\nFormulario → normaliza → valida (email, total > 0, concepto). Válido: registra en Sheets y envía comprobante. Inválido: aviso a Slack facturación. Aviso: esto envía comprobante, NO es CFDI ni factura fiscal. La factura oficial la emite tu sistema de facturación o contador. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('factura-pedidos-v2', 'Factura automática v2')
  .add(nota)
  .add(nuevoPedido)
  .to(normalizar)
  .to(pedidoValido
    .onTrue(registrar.to(enviar))
    .onFalse(revisionPedido))
  .add(errorAlerta)
  .to(alertarFallo);
