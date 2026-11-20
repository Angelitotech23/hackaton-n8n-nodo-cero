import { workflow, node, trigger, languageModel, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const facturaRecibida = trigger({
  type: 'n8n-nodes-base.gmailTrigger',
  version: 1.2,
  config: {
    name: 'Correo con factura PDF',
    parameters: {
      pollTimes: { item: [{ mode: 'everyMinute' }] },
      filters: { readStatus: 'unread', q: 'subject:factura has:attachment filename:pdf' },
      options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: 'attachment_' },
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
  },
  output: [{ id: '18c0fx', subject: 'Factura 123', from: 'proveedor@example.com' }]
});

const extraerTexto = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1,
  config: {
    name: 'Extraer texto del PDF',
    parameters: { operation: 'pdf', binaryPropertyName: 'attachment_0' },
    onError: 'continueRegularOutput',
  },
  output: [{ text: 'Proveedor: Papelería X. Fecha: 2026-11-01. Total: 116. IVA: 16.' }]
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.1 } },
  },
});

const extraerDatos = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Extraer datos de la factura',
    parameters: {
      promptType: 'define',
      text: expr('Texto de la factura:\n{{ $json.text ?? "" }}\nAsunto del correo: {{ $("Correo con factura PDF").item.json.subject }}'),
      options: {
        systemMessage: 'Extrae datos de una factura. Responde solo JSON con: proveedor, fecha (AAAA-MM-DD), total (número), impuesto (número), moneda. Si un dato no aparece, usa null. No inventes valores.',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: '{"proveedor":"Papelería X","fecha":"2026-11-01","total":116,"impuesto":16,"moneda":"MXN"}' }]
});

const separar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Separar campos',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'p', name: 'proveedor', value: expr('{{ JSON.parse($json.output).proveedor }}'), type: 'string' },
          { id: 'f', name: 'fecha', value: expr('{{ JSON.parse($json.output).fecha }}'), type: 'string' },
          { id: 't', name: 'total', value: expr('{{ JSON.parse($json.output).total }}'), type: 'number' },
          { id: 'i', name: 'impuesto', value: expr('{{ JSON.parse($json.output).impuesto }}'), type: 'number' },
          { id: 'm', name: 'moneda', value: expr('{{ JSON.parse($json.output).moneda }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ proveedor: 'Papelería X', fecha: '2026-11-01', total: 116, impuesto: 16, moneda: 'MXN' }]
});

const completa = ifElse({
  version: 2.2,
  config: {
    name: '¿Datos completos?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.proveedor }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { leftValue: expr('{{ $json.total }}'), operator: { type: 'number', operation: 'gt' }, rightValue: 0 },
          { leftValue: expr('{{ $json.fecha }}'), operator: { type: 'string', operation: 'notEmpty' } },
        ],
        combinator: 'and',
      },
    },
  },
});

const guardarGasto = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Guardar en hoja Gastos',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Gastos" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ proveedor: 'Papelería X', total: 116 }]
});

const guardarRevisar = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Guardar para revisar',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Revisar gastos" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ proveedor: null }]
});

const marcarLeido = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Marcar correo como leído',
    parameters: {
      resource: 'message',
      operation: 'markAsRead',
      messageId: expr('{{ $("Correo con factura PDF").item.json.id }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '18c0fx' }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Facturas recibidas v2' } }]
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

const nota = sticky('## Extracción de facturas v2\nGmail con PDF → extrae texto del PDF → IA devuelve JSON → valida. Completo: fila en Gastos. Incompleto: pestaña Revisar gastos. Solo PDF con texto (no escaneos). Siempre marca el correo como leído para no duplicar. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('facturas-recibidas-v2', 'Extracción de facturas v2')
  .add(nota)
  .add(facturaRecibida)
  .to(extraerTexto)
  .to(extraerDatos)
  .to(separar)
  .to(completa
    .onTrue(guardarGasto.to(marcarLeido))
    .onFalse(guardarRevisar.to(marcarLeido)))
  .add(errorAlerta)
  .to(alertarFallo);
