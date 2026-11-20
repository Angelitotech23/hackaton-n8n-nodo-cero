import { workflow, node, trigger, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const diario = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Todos los días 9:00',
    parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 9 * * *' }] } },
  },
  output: [{}]
});

const leerFacturas = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Leer hoja Facturas',
    parameters: {
      operation: 'read',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Facturas" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
  },
  output: [{ cliente: 'Ana', email: 'ana@example.com', monto: 100, vencimiento: '2026-11-01', pagado: 'no' }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar facturas',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          { id: 'p', name: 'pagado', value: expr('{{ String($json.pagado ?? "").trim().toLowerCase() }}'), type: 'string' },
          { id: 'e', name: 'email', value: expr('{{ String($json.email ?? "").trim().toLowerCase() }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ cliente: 'Ana', email: 'ana@example.com', monto: 100, vencimiento: '2026-11-01', pagado: 'no' }]
});

const vencidas = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: 'Solo vencidas sin pagar con email',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.pagado }}'), operator: { type: 'string', operation: 'notEquals' }, rightValue: 'si' },
          { leftValue: expr('{{ $json.email }}'), operator: { type: 'string', operation: 'contains' }, rightValue: '@' },
          { leftValue: expr('{{ $json.vencimiento }}'), operator: { type: 'dateTime', operation: 'before' }, rightValue: expr('{{ $now.toISO() }}') },
        ],
        combinator: 'and',
      },
    },
  },
  output: [{ cliente: 'Ana', email: 'ana@example.com', monto: 100, vencimiento: '2026-11-01', pagado: 'no' }]
});

const recordatorio = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar recordatorio',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $json.email }}'),
      subject: expr('Recordatorio: factura vencida de {{ $json.monto }}'),
      message: expr('Hola {{ $json.cliente }}. La factura por {{ $json.monto }} venció el {{ $json.vencimiento }} y aún no registramos el pago. Si ya pagaste, ignora este mensaje. Gracias.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const registrarEnvio = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Registrar recordatorio enviado',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Log recordatorios" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ cliente: 'Ana', enviado: true }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Recordatorio v2' } }]
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

const nota = sticky('## Recordatorio de facturas v2\nCada día 9:00 → lee hoja Facturas → normaliza → filtra vencidas, sin pagar y con email → envía recordatorio → registra en Log recordatorios. Si no hay vencidas, el flujo termina sin enviar nada. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('recordatorio-facturas-v2', 'Recordatorio de facturas v2')
  .add(nota)
  .add(diario)
  .to(leerFacturas)
  .to(normalizar)
  .to(vencidas)
  .to(recordatorio)
  .to(registrarEnvio)
  .add(errorAlerta)
  .to(alertarFallo);
