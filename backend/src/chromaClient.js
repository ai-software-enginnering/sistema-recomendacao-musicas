import { CloudClient } from 'chromadb';

let clientInstance = null;

/**
 * Lê variável obrigatória de ambiente
 */
function required(name) {
  const value = process.env[name];

  if (!value || String(value).trim() === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return String(value).trim();
}

/**
 * Retorna configuração do Chroma
 */
export function getChromaConfig() {
  return {
    apiKey: process.env.CHROMA_API_KEY?.trim() || '',
    tenant: process.env.CHROMA_TENANT?.trim() || '',
    database: process.env.CHROMA_DATABASE?.trim() || '',
    collection: process.env.CHROMA_COLLECTION?.trim() || 'liked_songs_v1'
  };
}

/**
 * Cria ou retorna a instância singleton do cliente
 */
export function getChromaClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const { apiKey, tenant, database } = getChromaConfig();

  clientInstance = new CloudClient({
    apiKey: apiKey || required('CHROMA_API_KEY'),
    tenant: tenant || required('CHROMA_TENANT'),
    database: database || required('CHROMA_DATABASE')
  });

  return clientInstance;
}

/**
 * Valida conexão com o Chroma sem derrubar a aplicação automaticamente
 */
export async function validateChromaConnection() {
  try {
    const client = getChromaClient();
    const { collection } = getChromaConfig();

    const col = await client.getCollection({ name: collection });

    if (!col) {
      return {
        ok: false,
        message: `Coleção '${collection}' não encontrada.`
      };
    }

    return {
      ok: true,
      message: `Coleção '${collection}' disponível.`
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Erro ao conectar ao ChromaDB.'
    };
  }
}

/**
 * Reseta singleton para testes
 */
export function resetChromaClient() {
  clientInstance = null;
}