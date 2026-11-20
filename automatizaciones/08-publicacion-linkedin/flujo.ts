import { workflow, node, trigger, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const cadaHora = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Cada hora',
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
  },
  output: [{}]
});

const leerContenido = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Leer hoja Contenido',
    parameters: {
      operation: 'read',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Contenido" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
  },
  output: [{ id: 'p1', fecha: '2026-11-19', texto: 'Post de prueba', estado: 'listo' }]
});

const paraPublicar = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: 'Solo listos de hoy con texto',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.estado }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'listo' },
          { leftValue: expr('{{ $json.fecha }}'), operator: { type: 'string', operation: 'equals' }, rightValue: expr('{{ $now.toFormat("yyyy-MM-dd") }}') },
          { leftValue: expr('{{ $json.texto }}'), operator: { type: 'string', operation: 'notEmpty' } },
        ],
        combinator: 'and',
      },
    },
  },
  output: [{ id: 'p1', fecha: '2026-11-19', texto: 'Post de prueba', estado: 'listo' }]
});

const publicar = node({
  type: 'n8n-nodes-base.linkedIn',
  version: 1,
  config: {
    name: 'Publicar en LinkedIn',
    parameters: {
      resource: 'post',
      operation: 'create',
      person: expr('{{ "PEGAR_ID_DE_PERSONA_O_PAGINA" }}'),
      text: expr('{{ $json.texto }}'),
    },
    credentials: { linkedInOAuth2Api: newCredential('LinkedIn') },
    onError: 'continueErrorOutput',
  },
  output: [{ id: 'urn:li:share:1' }]
});

const marcarPublicado = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Marcar como publicado',
    parameters: {
      operation: 'appendOrUpdate',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Contenido" }}'),
      columns: {
        mappingMode: 'defineBelow',
        value: { id: expr('{{ $("Solo listos de hoy con texto").item.json.id }}'), estado: 'publicado' },
        matchingColumns: ['id'],
      },
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: 'p1', estado: 'publicado' }]
});

const avisoError = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Avisar fallo de publicación',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ "PEGAR_TU_EMAIL" }}'),
      subject: 'No se pudo publicar en LinkedIn',
      message: expr('Falló la publicación del post {{ $("Solo listos de hoy con texto").item.json.id }}. Revisa el token de LinkedIn (caduca cada 60 días) y el permiso de la app.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const nota = sticky('## Publicación en LinkedIn v2\nCada hora → lee hoja Contenido → filtra estado "listo", fecha de hoy y texto → publica → marca "publicado". Si falla, email. Token de LinkedIn caduca cada 60 días. Requiere app aprobada. Reemplazar PEGAR_ID_DE_LA_HOJA, PEGAR_ID_DE_PERSONA_O_PAGINA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('publicacion-linkedin-v2b', 'Publicación LinkedIn v2')
  .add(nota)
  .add(cadaHora)
  .to(leerContenido)
  .to(paraPublicar)
  .to(publicar.to(marcarPublicado))
  .add(publicar)
  .onError(avisoError);
