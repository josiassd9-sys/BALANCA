// Serviço de gerenciamento de múltiplas pesagens

import type { WeighingItem, WeighingSet } from '@/components/scale/types';
export type { WeighingItem, WeighingSet };

export interface WeighingSession {
  id: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'closed';
  headerData: {
    client: string;
    plate: string;
    driver: string;
  };
  weighingSets: WeighingSet[];
  operationType: 'loading' | 'unloading';
  operationConfirmed?: boolean;
}

export class SessionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionConflictError';
  }
}

export const WEIGHING_SESSIONS_STORAGE_KEY = 'weighingSessions';
const STORAGE_KEY = WEIGHING_SESSIONS_STORAGE_KEY;
const MAX_OPEN_SESSIONS = 50;

function sanitizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeClientName(name: string): string {
  const trimmed = name.trim();
  return trimmed || 'Cliente sem nome';
}

// Verificar se sessão é mais antiga que 30 dias
function isSessionOlderThan30Days(createdAt: string): boolean {
  try {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return now - created > THIRTY_DAYS_MS;
  } catch {
    return false;
  }
}

// Limpar sessões mais antigas que 30 dias (rolling window como câmera)
function pruneOldSessions(sessions: WeighingSession[]): WeighingSession[] {
  const before = sessions.length;
  const filtered = sessions.filter(session => !isSessionOlderThan30Days(session.createdAt));
  const after = filtered.length;

  if (before > after) {
    console.info(`[Histórico] Removidas ${before - after} pesagens com mais de 30 dias`);
  }

  return filtered;
}

function sanitizeSession(input: unknown): WeighingSession | null {
  if (!input || typeof input !== 'object') return null;

  const candidate = input as Partial<WeighingSession>;
  const id = sanitizeString(candidate.id);
  if (!id) return null;

  const status: WeighingSession['status'] = candidate.status === 'closed' ? 'closed' : 'open';
  const operationType: WeighingSession['operationType'] =
    candidate.operationType === 'unloading' ? 'unloading' : 'loading';
  const createdAt = sanitizeString(candidate.createdAt, new Date().toISOString());
  const updatedAt = sanitizeString(candidate.updatedAt, createdAt);
  const headerData = {
    client: sanitizeString(candidate.headerData?.client),
    plate: sanitizeString(candidate.headerData?.plate),
    driver: sanitizeString(candidate.headerData?.driver),
  };

  const weighingSets = Array.isArray(candidate.weighingSets) ? (candidate.weighingSets as WeighingSet[]) : [];
  const clientName = normalizeClientName(sanitizeString(candidate.clientName, headerData.client));

  return {
    id,
    clientName,
    createdAt,
    updatedAt,
    status,
    headerData,
    weighingSets,
    operationType,
    operationConfirmed: Boolean(candidate.operationConfirmed),
  };
}

function loadSessionsFromStorage(): WeighingSession[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    const sanitized = parsed
      .map((item) => sanitizeSession(item))
      .filter((item): item is WeighingSession => Boolean(item));

    // Remove sessões mais antigas que 30 dias (rolling window automático)
    const pruned = pruneOldSessions(sanitized);

    // Se houve remoção, salva novamente
    if (pruned.length < sanitized.length) {
      saveSessions(pruned);
    }

    return pruned;
  } catch (e) {
    console.error('Erro ao carregar sessões:', e);
    return [];
  }
}

// Gerar ID único baseado em timestamp
export function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Formatar data para exibição
export function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Obter todas as sessões
export function getAllSessions(): WeighingSession[] {
  return loadSessionsFromStorage();
}

// Obter apenas sessões em aberto
export function getOpenSessions(): WeighingSession[] {
  return getAllSessions().filter(s => s.status === 'open');
}

// Salvar lista completa de sessões
function saveSessions(sessions: WeighingSession[]): void {
  if (typeof window === 'undefined') return;

  try {
    const normalized = sessions
      .map((session) => sanitizeSession(session))
      .filter((session): session is WeighingSession => Boolean(session));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error: unknown) {
    console.error('Erro ao salvar sessões:', error);

    throw new Error('Não foi possível salvar a pesagem', {
      cause: error,
    });
  }
}

// Criar nova sessão
export function createSession(
  headerData: WeighingSession['headerData'],
  weighingSets: WeighingSet[],
  operationType: 'loading' | 'unloading',
  operationConfirmed = true
): WeighingSession {
  const openSessions = getOpenSessions();

  if (openSessions.length >= MAX_OPEN_SESSIONS) {
    throw new Error(`Limite de ${MAX_OPEN_SESSIONS} pesagens em aberto atingido. Finalize ou exclua uma pesagem.`);
  }

  const now = new Date().toISOString();
  const session: WeighingSession = {
    id: generateSessionId(),
    clientName: normalizeClientName(headerData.client),
    createdAt: now,
    updatedAt: now,
    status: 'open',
    headerData,
    weighingSets,
    operationType,
    operationConfirmed,
  };

  const sessions = getAllSessions();
  sessions.push(session);
  saveSessions(sessions);

  return session;
}

// Atualizar sessão existente
export function updateSession(
  sessionId: string,
  updates: Partial<Omit<WeighingSession, 'id' | 'createdAt'>>,
  options?: {
    expectedUpdatedAt?: string;
    allowClosedUpdate?: boolean;
  }
): WeighingSession | null {
  const sessions = loadSessionsFromStorage();
  const index = sessions.findIndex(s => s.id === sessionId);

  if (index === -1) return null;

  const current = sessions[index];
  if (!current) return null;

  if (
    options?.expectedUpdatedAt &&
    current.updatedAt !== options.expectedUpdatedAt
  ) {
    throw new SessionConflictError('Esta sessão foi alterada em outra aba. Recarregue antes de salvar novamente.');
  }

  if (current.status === 'closed' && !options?.allowClosedUpdate) {
    throw new Error('Esta sessão já foi finalizada e não pode mais ser editada.');
  }

  sessions[index] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Atualiza nome do cliente se headerData foi alterado
  if (updates.headerData) {
    sessions[index].clientName = normalizeClientName(updates.headerData.client);
  }

  saveSessions(sessions);
  return sessions[index];
}

// Salvar/atualizar sessão atual
export function saveCurrentSession(
  sessionId: string | null,
  headerData: WeighingSession['headerData'],
  weighingSets: WeighingSet[],
  operationType: 'loading' | 'unloading',
  expectedUpdatedAt?: string
): WeighingSession {
  if (sessionId) {
    // Atualiza sessão existente
    const updated = updateSession(sessionId, {
      headerData,
      weighingSets,
      operationType
    }, {
      expectedUpdatedAt,
    });
    if (updated) return updated;
  }

  // Cria nova sessão
  return createSession(headerData, weighingSets, operationType);
}

// Carregar sessão específica
export function loadSession(sessionId: string): WeighingSession | null {
  return getAllSessions().find(s => s.id === sessionId) || null;
}

// Finalizar sessão
export function finalizeSession(sessionId: string, expectedUpdatedAt?: string): WeighingSession | null {
  return updateSession(
    sessionId,
    { status: 'closed' },
    {
      expectedUpdatedAt,
      allowClosedUpdate: true,
    }
  );
}

// Excluir sessão
export function deleteSession(sessionId: string): boolean {
  const sessions = loadSessionsFromStorage();
  const filtered = sessions.filter(s => s.id !== sessionId);

  if (filtered.length === sessions.length) return false;

  saveSessions(filtered);
  return true;
}

// Criar sessão em branco (novo)
export function createBlankSession(
  operationType: 'loading' | 'unloading' = 'loading',
  operationConfirmed = false
): WeighingSession {
  const emptyHeader = { client: '', plate: '', driver: '' };
  const emptySet: WeighingSet = {
    id: generateSessionId(),
    name: 'CX 1',
    items: [],
    descontoCacamba: 0
  };

  return createSession(emptyHeader, [emptySet], operationType, operationConfirmed);
}

// Limpar todas as sessões (cuidado!)
export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Calcular uso de localStorage das sessões
export function getStorageStats(): {
  bytesUsed: number;
  bytesAvailable: number;
  percentageUsed: number;
  isWarning: boolean;
} {
  if (typeof window === 'undefined') {
    return { bytesUsed: 0, bytesAvailable: 5 * 1024 * 1024, percentageUsed: 0, isWarning: false };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY) || '';
    const bytesUsed = new Blob([data]).size;
    // Estimativa conservadora: 5 MB disponível (navegadores modernos usam mais, mas 5 MB é padrão)
    const bytesAvailable = 5 * 1024 * 1024;
    const percentageUsed = Math.round((bytesUsed / bytesAvailable) * 100);
    const isWarning = percentageUsed >= 80;

    return {
      bytesUsed,
      bytesAvailable,
      percentageUsed,
      isWarning
    };
  } catch (e) {
    console.error('Erro ao calcular uso de storage:', e);
    return { bytesUsed: 0, bytesAvailable: 5 * 1024 * 1024, percentageUsed: 0, isWarning: false };
  }
}

//export { getAllSessions };  // caso algum lugar precise