import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { OperationType, WeighingSet } from '@/components/scale/types';
import type { WeighingSession } from '@/services/weighing-sessions';
import { finalizeSession, loadSession, saveCurrentSession, SessionConflictError } from '@/services/weighing-sessions';
import { applySetVisibility } from '@/services/weighing-set-visibility';

type HeaderData = {
  client: string;
  plate: string;
  driver: string;
};

type ToastFn = (params: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

type UseWeighingSessionActionsParams = {
  weighingSets: WeighingSet[];
  initialWeighingSet: WeighingSet;
  setCurrentSessionId: (value: string | null) => void;
  setCurrentSessionUpdatedAt: (value: string | null) => void;
  setSessionStatus: (value: 'open' | 'closed') => void;
  setHeaderData: (value: HeaderData) => void;
  setWeighingSets: (value: WeighingSet[]) => void;
  setOperationType: (value: OperationType) => void;
  setWeighingId: (value: string) => void;
  setActiveSetId: (value: string | null) => void;
  refreshSessions: () => void;
  toast: ToastFn;
};

export function useWeighingSessionActions({
  weighingSets,
  initialWeighingSet,
  setCurrentSessionId,
  setCurrentSessionUpdatedAt,
  setSessionStatus,
  setHeaderData,
  setWeighingSets,
  setOperationType,
  setWeighingId,
  setActiveSetId,
  refreshSessions,
  toast,
}: UseWeighingSessionActionsParams) {
  const handleSessionSelect = useCallback((session: WeighingSession) => {
    setCurrentSessionId(session.id);
    setCurrentSessionUpdatedAt(session.updatedAt);
    setSessionStatus(session.status);
    setHeaderData(session.headerData || { client: '', plate: '', driver: '' });
    setWeighingSets(applySetVisibility(session.id, session.weighingSets || []));
    setOperationType(session.operationType || 'loading');
    setWeighingId(session.id);
    if (session.weighingSets?.length > 0) {
      setActiveSetId(session.weighingSets[0].id);
    }
    toast({
      title: 'Pesagem carregada',
      description: session.clientName || 'Cliente sem nome',
    });
    refreshSessions();
  }, [
    refreshSessions,
    setActiveSetId,
    setCurrentSessionId,
    setCurrentSessionUpdatedAt,
    setHeaderData,
    setOperationType,
    setSessionStatus,
    setWeighingId,
    setWeighingSets,
    toast,
  ]);

  const handleNewSession = useCallback((newSession: WeighingSession) => {
    setCurrentSessionId(newSession.id);
    setCurrentSessionUpdatedAt(newSession.updatedAt);
    setSessionStatus('open');
    setHeaderData({ client: '', plate: '', driver: '' });
    const firstSetId = uuidv4();
    setWeighingSets([{ ...initialWeighingSet, id: firstSetId, items: [], showAll: false }]);
    setActiveSetId(firstSetId);
    setOperationType(newSession.operationType || 'loading');
    setWeighingId(newSession.id);
    refreshSessions();
    toast({
      title: 'Nova pesagem criada',
      description: 'Preencha os dados do cliente',
    });
  }, [
    initialWeighingSet,
    refreshSessions,
    setActiveSetId,
    setCurrentSessionId,
    setCurrentSessionUpdatedAt,
    setHeaderData,
    setOperationType,
    setSessionStatus,
    setWeighingId,
    setWeighingSets,
    toast,
  ]);

  const handleFinalize = useCallback((currentSessionId: string | null, currentSessionUpdatedAt: string | null) => {
    if (!currentSessionId) return false;

    try {
      const finalized = finalizeSession(currentSessionId, currentSessionUpdatedAt || undefined);
      if (!finalized) {
        toast({
          variant: 'destructive',
          title: 'Sessão não encontrada',
          description: 'A sessão ativa não existe mais. Atualize a lista de pesagens.',
        });
        refreshSessions();
        return false;
      }

      setCurrentSessionUpdatedAt(finalized.updatedAt);
      setSessionStatus('closed');
      refreshSessions();
      toast({
        title: 'Pesagem finalizada',
        description: 'Não é mais possível editar esta sessão.',
      });
      return true;
    } catch (err) {
      if (err instanceof SessionConflictError) {
        const latest = loadSession(currentSessionId);
        if (latest) {
          handleSessionSelect(latest);
          toast({
            title: 'Sessão recarregada',
            description: 'A sessão foi atualizada em outra aba e a versão mais recente foi carregada.',
          });
          return false;
        }
      }

      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar',
        description: err instanceof Error ? err.message : 'Falha desconhecida ao finalizar sessão.',
      });
      return false;
    }
  }, [handleSessionSelect, refreshSessions, setCurrentSessionUpdatedAt, setSessionStatus, toast]);

  const handleSave = useCallback((currentSessionId: string | null, currentSessionUpdatedAt: string | null, headerData: HeaderData, operationType: OperationType) => {
    if (!currentSessionId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma sessão ativa' });
      return;
    }

    if (!headerData.client.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome do cliente obrigatório',
        description: 'Informe o cliente antes de salvar a pesagem.',
      });
      return;
    }

    try {
      const updatedSession = saveCurrentSession(
        currentSessionId,
        headerData,
        weighingSets,
        operationType,
        currentSessionUpdatedAt || undefined
      );
      setCurrentSessionId(updatedSession.id);
      setCurrentSessionUpdatedAt(updatedSession.updatedAt);
      setWeighingId(updatedSession.id);
      setSessionStatus(updatedSession.status);
      refreshSessions();
      toast({
        title: 'Pesagem salva',
        description: `Cliente: ${updatedSession.clientName || 'Sem nome'}`,
      });
    } catch (err) {
      if (err instanceof SessionConflictError) {
        const latest = loadSession(currentSessionId);
        if (latest) {
          handleSessionSelect(latest);
          toast({
            title: 'Sessão recarregada',
            description: 'A sessão foi alterada em outra aba e a versão mais recente foi carregada.',
          });
          return;
        }
      }

      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
      });
    }
  }, [
    refreshSessions,
    setCurrentSessionId,
    setCurrentSessionUpdatedAt,
    setSessionStatus,
    setWeighingId,
    handleSessionSelect,
    toast,
    weighingSets,
  ]);

  return {
    handleSessionSelect,
    handleNewSession,
    handleFinalize,
    handleSave,
  };
}