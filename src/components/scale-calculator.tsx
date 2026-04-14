
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Tractor } from "lucide-react";
import { useScale } from "@/hooks/use-scale";
import { SettingsDialog } from "./SettingsDialog";
import { useTheme } from "@/hooks/use-theme";
import { format } from "date-fns";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useRouter } from 'next/navigation';
import { WeighingSetCard } from "@/components/scale/WeighingSetCard";
import { ScaleCalculatorTopBar } from "@/components/scale/ScaleCalculatorTopBar";
import { ScaleCalculatorFooter } from "@/components/scale/ScaleCalculatorFooter";
import { ScaleSessionHeaderCard } from "@/components/scale/ScaleSessionHeaderCard";
import { useWeighingSessionActions } from "@/hooks/use-weighing-session-actions";
import { generateWeighingPdf } from "@/services/weighing-pdf";
import { loadPrintLayoutConfig } from "@/services/print-settings";
import { applySetVisibility, persistSetVisibilityBySession } from "@/services/weighing-set-visibility";
import type { OperationType, WeighingItem, WeighingSet } from "@/components/scale/types";

import {
  createBlankSession,
  getOpenSessions,
  WEIGHING_SESSIONS_STORAGE_KEY,
} from "@/services/weighing-sessions";

const initialItem: WeighingItem = { id: '', material: '', bruto: 0, tara: 0, descontos: 0, liquido: 0, locked: false };
const initialWeighingSet: WeighingSet = { id: uuidv4(), name: "CX 1", items: [], descontoCacamba: 0, showAll: false, isCollapsed: false };

const ScaleCalculator = forwardRef((props, ref) => {
  const router = useRouter();
  const { weight: liveWeight, status, config, setConfig, saveConfig } = useScale();
  const { theme } = useTheme();
  const [headerData, setHeaderData] = useState({ client: "", plate: "", driver: "" });
  const [weighingSets, setWeighingSets] = useState<WeighingSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<OperationType>('loading');
  const [hasConfirmedOperationType, setHasConfirmedOperationType] = useState(false);
  const [, setWeighingId] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingCopiedWeight, setPendingCopiedWeight] = useState<string | null>(null);
  const [sessionsRevision, setSessionsRevision] = useState(0);
  const [isAnyInputFocused, setIsAnyInputFocused] = useState(false);
  const [, setActiveInput] = useState<{
    setId?: string;
    itemId?: string;
    field?: keyof WeighingItem;
    type: 'initial' | 'item' | null;
  }>({ type: null });
  
    // ====================== MULTI-SESSÕES ======================
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionUpdatedAt, setCurrentSessionUpdatedAt] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'open' | 'closed'>('open');
  const lastTitleTapRef = useRef<Record<string, number>>({});

  const refreshSessions = useCallback(() => {
    setSessionsRevision((r) => r + 1);
  }, []);

  const {
    handleSessionSelect,
    handleNewSession,
    handleFinalize,
    handleSave,
  } = useWeighingSessionActions({
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
  });

  const generateWeighingId = () => format(new Date(), 'ddMMyyHHmm');

  const clearState = (isInitial = false) => {
    const newId = uuidv4();
    const newWeighingSet: WeighingSet = { ...initialWeighingSet, id: newId, items: [], isCollapsed: false };
    
    setWeighingSets([{...newWeighingSet, name: 'CX 1', items: []}]);
    setActiveSetId(newId);
    setHeaderData({ client: "", plate: "", driver: "" });
    setOperationType('loading');
    setHasConfirmedOperationType(false);
    setWeighingId(generateWeighingId());

    if (!isInitial) {
      toast({ title: "Limpo!", description: "Todos os campos foram resetados." });
    }
  };
   
   useEffect(() => {
  // Carrega sessões abertas do serviço (localStorage chave "weighingSessions")
  const openSessions = getOpenSessions();

  if (openSessions.length > 0) {
    // Existe pelo menos uma pesagem em aberto → carrega a mais recente
    const mostRecent = openSessions[openSessions.length - 1];
    
    setCurrentSessionId(mostRecent.id);
    setCurrentSessionUpdatedAt(mostRecent.updatedAt);
    setSessionStatus(mostRecent.status);
    setHeaderData(mostRecent.headerData || { client: "", plate: "", driver: "" });
    setWeighingSets(applySetVisibility(mostRecent.id, mostRecent.weighingSets || []));
    setOperationType(mostRecent.operationType || 'loading');
    setWeighingId(mostRecent.id); // mantém compatibilidade com PDF/impressão

    if (mostRecent.weighingSets?.length > 0) {
      setActiveSetId(mostRecent.weighingSets[0].id);
    }

    setHasConfirmedOperationType(true);

    toast({
      title: "Pesagem carregada",
      description: `Continuando: ${mostRecent.clientName || "Sem cliente"}`
    });
  } else {
    // Nenhuma sessão aberta → cria uma nova em branco
    const newSession = createBlankSession();
    setHasConfirmedOperationType(false);
    setCurrentSessionUpdatedAt(newSession.updatedAt);
    handleNewSession(newSession);
  }

  // Atualiza contador para forçar render do dropdown (se necessário)
  refreshSessions();
}, []); // executa apenas uma vez na montagem

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        setIsAnyInputFocused(true);
      }
    };

    const handleFocusOut = () => {
      window.setTimeout(() => {
        const activeElement = document.activeElement;
        const hasInputFocus =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement;
        setIsAnyInputFocused(hasInputFocus);
      }, 0);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  useEffect(() => {
    if (weighingSets.length > 0 && !weighingSets.find(s => s.id === activeSetId)) {
      setActiveSetId(weighingSets[0].id);
    }
  }, [weighingSets, activeSetId]);


  const handleHeaderChange = (field: keyof typeof headerData, value: string) => {
    if (field === 'plate') {
        const formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
        setHeaderData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
        setHeaderData(prev => ({ ...prev, [field]: value.toUpperCase() }));
    }
  };

  const handleInputChange = (setId: string, itemId: string, field: keyof WeighingItem, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    
    setWeighingSets(prevSets => {
      return prevSets.map(set => {
        if (set.id === setId) {
          let needsReorder = false;
          const newItems = set.items.map((item, index) => {
            if (item.id === itemId) {
              if (item.locked) {
                return item;
              }
              const updatedItem = { ...item, [field]: numValue };
              const bruto = updatedItem.bruto;
              const tara = updatedItem.tara;
              const descontos = updatedItem.descontos;
              updatedItem.liquido = bruto - tara - descontos;

              if (index === 0 && (field === 'bruto' || field === 'tara')) {
                needsReorder = true;
              }
              return updatedItem;
            }
            return item;
          });

          if(needsReorder) {
             for(let i=1; i<newItems.length; i++) {
                // Skip reordering for reclassified items (they have independent tara/bruto values)
                if (newItems[i].reclassFromItemId) {
                  continue;
                }
                if (operationType === 'loading') {
                  newItems[i].tara = newItems[i-1].bruto;
                } else {
                  newItems[i].bruto = newItems[i-1].tara;
                }
                newItems[i].liquido = newItems[i].bruto - newItems[i].tara - newItems[i].descontos;
             }
          }

          return { ...set, items: newItems };
        }
        return set;
      });
    });
  };
  
  const handleMaterialChange = (setId: string, itemId: string, newMaterial: string) => {
    setWeighingSets(prevSets =>
      prevSets.map(set => {
        if (set.id === setId) {
          const newItems = set.items.map(item =>
            item.id === itemId && !item.locked ? { ...item, material: newMaterial.toUpperCase() } : item
          );
          return { ...set, items: newItems };
        }
        return set;
      })
    );
  };
  
  const handleSetNameChange = (setId: string, newName: string) => {
    setWeighingSets(prevSets =>
      prevSets.map(set =>
        set.id === setId ? { ...set, name: newName.toUpperCase() } : set
      )
    );
  };

  const handleCacambaDiscount = (setId: string, value: string) => {
     const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
     setWeighingSets(prev => prev.map(set => set.id === setId ? {...set, descontoCacamba: numValue} : set));
  };
  
  const addNewMaterial = (setId: string) => {
    const firstSet = weighingSets[0];
    const shouldCheckInversion =
      hasConfirmedOperationType &&
      firstSet?.id === setId &&
      firstSet.items.length === 1;

    if (shouldCheckInversion) {
      const firstItem = firstSet.items[0];
      if (firstItem && firstItem.bruto > 0 && firstItem.tara > 0 && firstItem.bruto < firstItem.tara) {
        const confirmed = window.confirm(
          "Peso invertido detectado no primeiro material (Bruto menor que Tara). Deseja inverter o tipo de pesagem para corrigir?"
        );

        if (confirmed) {
          setWeighingSets((prevSets) =>
            prevSets.map((set) => ({
              ...set,
              items: set.items.map((item) => {
                // Skip inversion swap for reclassified items - preserve their independent bridge values
                if (item.reclassFromItemId) {
                  return item;
                }
                const swappedBruto = item.tara;
                const swappedTara = item.bruto;
                return {
                  ...item,
                  bruto: swappedBruto,
                  tara: swappedTara,
                  liquido: swappedBruto - swappedTara - item.descontos,
                };
              }),
            }))
          );
          setOperationType((prev) => (prev === 'loading' ? 'unloading' : 'loading'));
          toast({
            title: "Tipo de pesagem invertido",
            description: "A inversão foi corrigida. Toque em Adicionar material novamente para continuar.",
          });
          return;
        }
      }
    }

    setWeighingSets(prevSets =>
      prevSets.map(set => {
        if (set.id === setId) {
          const lastItem = set.items[set.items.length - 1];

          if (lastItem && !lastItem.reclassFromItemId) {
            // Only validate full completion for non-reclassified items
            const hasMaterial = lastItem.material.trim().length > 0;
            const hasBruto = lastItem.bruto > 0;
            const hasTara = lastItem.tara > 0;

            if (!hasMaterial || !hasBruto || !hasTara) {
              toast({
                variant: "destructive",
                title: "Material incompleto",
                description: "Preencha Material, Bruto e Tara do item atual antes de adicionar outro.",
              });
              return set;
            }
          } else if (lastItem?.reclassFromItemId) {
            // For reclassified items, only require material to be filled
            if (!lastItem.material.trim().length) {
              toast({
                variant: "destructive",
                title: "Material incompleto",
                description: "Preencha o Material para a reclassificação antes de adicionar outro.",
              });
              return set;
            }
          }

          const firstSetFirstItem = weighingSets[0]?.items[0];
          
          let initialWeight = 0;
          if (firstSetFirstItem) {
              initialWeight = operationType === 'loading' ? firstSetFirstItem.tara : firstSetFirstItem.bruto
          }

          let newItem: WeighingItem;

          if (operationType === 'loading') { // Venda - Carregamento
             newItem = {
              id: uuidv4(),
              material: "",
              bruto: 0,
              tara: lastItem?.bruto ?? initialWeight,
              descontos: 0,
              liquido: 0,
              locked: false,
            };
          } else { // Compra - Descarregamento
            newItem = {
              id: uuidv4(),
              material: "",
              bruto: lastItem?.tara ?? initialWeight,
              tara: 0,
              descontos: 0,
              liquido: 0,
              locked: false,
            };
          }

          const lockedItems = set.items.map((item, index) => {
            const isLast = index === set.items.length - 1;
            return isLast ? { ...item, locked: true } : item;
          });

          return { ...set, items: [...lockedItems, newItem], showAll: false };
        }
        return set;
      })
    );
  };
  
  const addNewSet = () => {
    const newSetNumber = weighingSets.length + 1;
    const newSet: WeighingSet = {
        id: uuidv4(),
        name: `CX ${newSetNumber}`,
        items: [],
      descontoCacamba: 0,
      showAll: false,
      isCollapsed: false,
    };

    setWeighingSets((prev) => {
      const collapsedFirst = prev.map((set, index) =>
        index === 0 ? { ...set, showAll: false } : set
      );
      return [...collapsedFirst, newSet];
    });
    setActiveSetId(newSet.id);
  };

  const removeSet = (setId: string) => {
    setWeighingSets(prev => {
        const newSets = prev.filter(s => s.id !== setId);
        if (newSets.length === 0) {
            const newId = uuidv4();
            const renumberedSets = [{ ...initialWeighingSet, id: newId, name: 'CX 1', items: [] }];
            setActiveSetId(newId);
            return renumberedSets;
        }
        
        const renumberedSets = newSets.map((s, index) => ({
            ...s,
            name: `CX ${index + 1}`
        }));
        
        if (activeSetId === setId) {
            setActiveSetId(renumberedSets[0]?.id || null);
        }
        return renumberedSets;
    });
  };

  const removeMaterial = (setId: string, itemId: string) => {
    setWeighingSets(prevSets =>
        prevSets.map(set => {
            if (set.id === setId) {
                const removedItem = set.items.find(item => item.id === itemId);
                const linkedReclassItems = set.items.filter(item => item.reclassFromItemId === itemId);
                
                // Warn if removing origin item with linked reclassifications
                if (linkedReclassItems.length > 0 && !removedItem?.reclassFromItemId) {
                  const confirmed = window.confirm(
                    `Este material tem ${linkedReclassItems.length} reclassificação(ões) vinculada(s). Deseja remover mesmo assim?\n\nOs reclassificados serão mantidos, mas perderão a vinculação com a origem.`
                  );
                  if (!confirmed) return set;
                }
                
                const filteredItems = set.items.filter(item => item.id !== itemId);
                const lastIndex = filteredItems.length - 1;
                const newItems = filteredItems.map((item, index) => ({
                  ...item,
                  locked: index === lastIndex ? false : item.locked,
                }));

                if (removedItem?.reclassFromItemId) {
                  const originIndex = newItems.findIndex((item) => item.id === removedItem.reclassFromItemId);
                  if (originIndex >= 0) {
                    const originItem = { ...newItems[originIndex] };
                    originItem.tara = Math.max(0, originItem.tara - removedItem.liquido);
                    originItem.liquido = originItem.bruto - originItem.tara - originItem.descontos;
                    newItems[originIndex] = originItem;
                  }
                }

                return { ...set, items: newItems };
            }
            return set;
        })
    );
  };

  const handleReclassifyMaterial = (setId: string, itemId: string) => {
    const targetSet = weighingSets.find((set) => set.id === setId);
    const targetItem = targetSet?.items.find((item) => item.id === itemId);

    if (!targetSet || !targetItem) {
      toast({ variant: "destructive", title: "Material não encontrado" });
      return;
    }

    if (!targetItem.locked) {
      toast({
        variant: "destructive",
        title: "Feche o material antes",
        description: "A reclassificação só fica disponível após o fechamento do material.",
      });
      return;
    }

    if (targetItem.reclassFromItemId) {
      toast({
        variant: "destructive",
        title: "Ação indisponível",
        description: "Não é possível reclassificar um item que já é de reclassificação.",
      });
      return;
    }

    if (targetItem.liquido <= 0) {
      toast({
        variant: "destructive",
        title: "Sem líquido para reclassificar",
      });
      return;
    }

    const newItemId = uuidv4();

    setWeighingSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;

        const originIndex = set.items.findIndex((item) => item.id === itemId);
        if (originIndex < 0) return set;

        const originItem = set.items[originIndex];
        if (!originItem) return set;

        const alreadyHasOpenReclass = set.items.some(
          (item) => item.reclassFromItemId === itemId && !item.locked
        );

        if (alreadyHasOpenReclass) {
          return set;
        }

        const reclassItem: WeighingItem = {
          id: newItemId,
          material: "",
          bruto: originItem.tara,
          tara: originItem.tara,
          descontos: 0,
          liquido: 0,
          locked: false,
          reclassFromItemId: itemId,
          reclassWeight: 0,
        };

        const nextItems = [...set.items];
        nextItems.splice(originIndex + 1, 0, reclassItem);

        return { ...set, items: nextItems, showAll: true, isCollapsed: false };
      })
    );

    toast({
      title: "Reclassificação iniciada",
      description: "Preencha o material encontrado e ajuste o peso. O valor será abatido do material de origem.",
    });

    window.setTimeout(() => {
      const input = document.getElementById(`material-${setId}-${newItemId}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
      }
    }, 80);
  };

  const handleReclassWeightChange = (setId: string, itemId: string, value: string) => {
    const requestedWeight = parseInt(value.replace(/\D/g, ''), 10) || 0;

    setWeighingSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;

        const targetIndex = set.items.findIndex((item) => item.id === itemId);
        if (targetIndex < 0) return set;

        const targetItem = set.items[targetIndex];
        if (!targetItem || !targetItem.reclassFromItemId || targetItem.locked) return set;

        const originIndex = set.items.findIndex((item) => item.id === targetItem.reclassFromItemId);
        if (originIndex < 0) return set;

        const originItem = set.items[originIndex];
        if (!originItem) return set;

        const available = Math.max(0, originItem.liquido + targetItem.liquido);
        const appliedWeight = Math.min(requestedWeight, available);
        const baseTara = Math.max(0, originItem.tara - targetItem.liquido);
        const updatedOriginTara = baseTara + appliedWeight;

        const updatedTarget = { ...targetItem, reclassWeight: appliedWeight };
        updatedTarget.tara = baseTara;
        updatedTarget.bruto = updatedOriginTara;
        updatedTarget.liquido = Math.max(0, appliedWeight);

        const updatedOrigin = { ...originItem };
        updatedOrigin.tara = updatedOriginTara;
        updatedOrigin.liquido = updatedOrigin.bruto - updatedOrigin.tara - updatedOrigin.descontos;

        const nextItems = [...set.items];
        nextItems[targetIndex] = updatedTarget;
        nextItems[originIndex] = updatedOrigin;

        return { ...set, items: nextItems };
      })
    );
  };

  const handleClear = (isInitialLoad = false) => {
    clearState(isInitialLoad);
  };

  const toggleSetVisibility = (setId: string) => {
    setWeighingSets((prevSets) =>
      prevSets.map((set) =>
        set.id === setId ? { ...set, showAll: !set.showAll } : set
      )
    );
  };

  const toggleSetCollapse = (setId: string) => {
    setWeighingSets((prevSets) =>
      prevSets.map((set) =>
        set.id === setId ? { ...set, isCollapsed: !set.isCollapsed } : set
      )
    );
  };

  const handleSetTitlePointerUp = (setId: string) => {
    const now = Date.now();
    const lastTap = lastTitleTapRef.current[setId] || 0;
    if (now - lastTap < 350) {
      toggleSetVisibility(setId);
      lastTitleTapRef.current[setId] = 0;
      return;
    }
    lastTitleTapRef.current[setId] = now;
  };

  useEffect(() => {
    persistSetVisibilityBySession(currentSessionId, weighingSets);
  }, [currentSessionId, weighingSets]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WEIGHING_SESSIONS_STORAGE_KEY) return;

      const openSessions = getOpenSessions();
      const hasCurrentSession = currentSessionId
        ? openSessions.some((session) => session.id === currentSessionId)
        : false;

      if (hasCurrentSession) {
        refreshSessions();
        return;
      }

      if (openSessions.length > 0) {
        const mostRecent = openSessions[openSessions.length - 1];
        if (mostRecent) {
          setHasConfirmedOperationType(Boolean(mostRecent.operationConfirmed ?? true));
          handleSessionSelect(mostRecent);
          toast({
            title: 'Sessão sincronizada',
            description: 'A sessão ativa mudou em outra aba e foi atualizada.',
          });
          return;
        }
      }

      const newSession = createBlankSession();
      setHasConfirmedOperationType(Boolean(newSession.operationConfirmed));
      handleNewSession(newSession);
      toast({
        title: 'Sessão recriada',
        description: 'A sessão ativa foi removida em outra aba.',
      });
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [currentSessionId, handleNewSession, handleSessionSelect, refreshSessions, toast]);

  const grandTotalLiquido = weighingSets.reduce((total, set) => {
    const setItemsTotal = set.items.reduce((acc, item) => acc + item.liquido, 0);
    return total + (setItemsTotal - set.descontoCacamba);
  }, 0);

const handlePrint = async () => {
  if (weighingSets.length === 0) {
    toast({ title: "Nenhuma pesagem para imprimir", variant: "destructive" });
    return;
  }

  try {
    const printLayoutConfig = loadPrintLayoutConfig();
    const outputMode = await generateWeighingPdf({
      headerData,
      weighingSets,
      grandTotalLiquido,
      printLayoutConfig,
    });

    if (outputMode === 'native') {
      toast({
        title: "Comprovante gerado",
        description: "PDF salvo em Documentos/PesagensFinalizadas e opção de compartilhamento exibida.",
        variant: "default",
      });
    } else {
      toast({
        title: "Comprovante gerado",
        description: "PDF baixado automaticamente no navegador.",
        variant: "default",
      });
    }

  } catch (err) {
    console.error("ERRO COMPLETO NA GERAÇÃO DE PDF:", err);
    toast({
      title: "Erro ao gerar PDF",
      description: err instanceof Error ? err.message : "Falha desconhecida",
      variant: "destructive"
    });
  }
};

const handleFinalizeWithPdf = async () => {
  const firstSet = weighingSets[0];
  const firstItem = firstSet?.items[0];
  if (
    hasConfirmedOperationType &&
    firstItem &&
    firstItem.bruto > 0 &&
    firstItem.tara > 0 &&
    firstItem.bruto < firstItem.tara
  ) {
    const confirmed = window.confirm(
      "Peso invertido detectado no primeiro material (Bruto menor que Tara). Deseja inverter o tipo de pesagem antes de finalizar?"
    );

    if (confirmed) {
      setWeighingSets((prevSets) =>
        prevSets.map((set) => ({
          ...set,
          items: set.items.map((item) => {
            // Skip inversion swap for reclassified items - preserve their independent bridge values
            if (item.reclassFromItemId) {
              return item;
            }
            const swappedBruto = item.tara;
            const swappedTara = item.bruto;
            return {
              ...item,
              bruto: swappedBruto,
              tara: swappedTara,
              liquido: swappedBruto - swappedTara - item.descontos,
            };
          }),
        }))
      );
      setOperationType((prev) => (prev === 'loading' ? 'unloading' : 'loading'));
      toast({
        title: "Tipo de pesagem invertido",
        description: "Dados corrigidos. Revise e finalize novamente.",
      });
      return;
    }
  }

  if (!currentSessionId) {
    toast({
      variant: "destructive",
      title: "Nenhuma sessão ativa",
      description: "Não foi possível finalizar sem uma pesagem em aberto.",
    });
    return;
  }

  const finalized = handleFinalize(currentSessionId, currentSessionUpdatedAt);
  if (!finalized) {
    return;
  }

  if (weighingSets.length === 0) {
    toast({
      title: "Pesagem finalizada",
      description: "Sessão fechada sem itens para gerar comprovante.",
    });
    return;
  }

  try {
    const printLayoutConfig = loadPrintLayoutConfig();
    const outputMode = await generateWeighingPdf({
      headerData,
      weighingSets,
      grandTotalLiquido,
      printLayoutConfig,
    });

    if (outputMode === 'native') {
      toast({
        title: "Comprovante gerado",
        description: "PDF salvo em Documentos/PesagensFinalizadas e opção de compartilhamento exibida.",
      });
    } else {
      toast({
        title: "Comprovante gerado",
        description: "PDF baixado automaticamente no navegador.",
      });
    }
  } catch (err) {
    console.error("ERRO AO GERAR PDF APOS FINALIZAR:", err);
    toast({
      variant: "destructive",
      title: "Pesagem finalizada com pendência",
      description: err instanceof Error
        ? `A sessão foi finalizada, mas o PDF falhou: ${err.message}`
        : "A sessão foi finalizada, mas houve falha ao gerar o PDF.",
    });
  }
};

  const handleFetchLiveWeight = (callback: (weight: string) => void): boolean => {
    if (status !== 'connected') {
      toast({
        variant: "destructive",
        title: "Balança não conectada",
        description: "Verifique a conexão com a balança.",
      });
      return false;
    }
    callback(liveWeight.toString());
    toast({ title: "Peso Capturado!", description: `Peso de ${liveWeight}kg capturado.` });
    return true;
  };

  useImperativeHandle(ref, () => ({
    handleClear,
    handleSave: () => handleSave(currentSessionId, currentSessionUpdatedAt, headerData, operationType),
    handlePrint,
  }));
  


  const firstSet = weighingSets.length > 0 ? weighingSets[0] : null;
  const initialWeightField = operationType === 'loading' ? 'tara' : 'bruto';

  const getInitialWeightValue = () => {
    if (firstSet) {
        if (firstSet.items.length > 0) {
            return firstSet.items[0][initialWeightField];
        }
    }
    return 0;
  }
  const initialWeightValue = getInitialWeightValue();
  const isInitialWeightLocked = Boolean(firstSet?.items?.[0]?.locked) || !hasConfirmedOperationType;

  const handleInitialWeightChange = (value: string) => {
    if (!hasConfirmedOperationType) {
      toast({
        variant: "destructive",
        title: "Selecione o tipo de operação",
        description: "Escolha Carregamento ou Descarregamento antes de informar o primeiro peso.",
      });
      return;
    }

    const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setWeighingSets(prev => {
        const newSets = [...prev];
        if (newSets.length > 0) {
            if (newSets[0].items.length === 0) {
                const newItem = { 
                    ...initialItem, 
                    id: uuidv4(),
                    material: '', 
                    [initialWeightField]: numValue 
                };
                newSets[0].items.push(newItem);
                 // Also update liquido since it might be the only item
                newItem.liquido = newItem.bruto - newItem.tara - newItem.descontos;
            } else {
                const firstItem = { ...newSets[0].items[0] };
                if (firstItem.locked) {
                  return newSets;
                }
                const otherField = initialWeightField === 'bruto' ? 'tara' : 'bruto';
                if(firstItem[otherField] !== 0) {
                  firstItem[otherField] = 0;
                }
                
                firstItem[initialWeightField] = numValue;
                firstItem.liquido = firstItem.bruto - firstItem.tara - firstItem.descontos;
                newSets[0].items[0] = firstItem;
            }
        }
        return newSets;
    });
  };

    const handleInitialWeightFetch = (): boolean => {
     if (!hasConfirmedOperationType) {
      toast({
        variant: "destructive",
        title: "Selecione o tipo de operação",
        description: "Escolha Carregamento ou Descarregamento antes de capturar o primeiro peso.",
      });
      return false;
    }

      return handleFetchLiveWeight((weight) => {
        handleInitialWeightChange(weight);
     });
  }

  const handleWeightInputFocus = (target: {
    setId?: string;
    itemId?: string;
    field?: 'bruto' | 'tara';
    type: 'initial' | 'item';
  }) => {
    setActiveInput(target);

    if (!pendingCopiedWeight) return;

    if (target.type === 'initial') {
      if (!hasConfirmedOperationType) {
        toast({
          variant: "destructive",
          title: "Selecione o tipo de operação",
          description: "Escolha Carregamento ou Descarregamento antes de informar o primeiro peso.",
        });
        return;
      }
      handleInitialWeightChange(pendingCopiedWeight);
    } else if (target.type === 'item' && target.setId && target.itemId && target.field) {
      handleInputChange(target.setId, target.itemId, target.field, pendingCopiedWeight);
    }

    setPendingCopiedWeight(null);
    toast({ title: "Peso colado", description: "Peso colado automaticamente no campo." });
  };

  const initialLabel = operationType === 'loading' ? 'Tara' : 'Bruto';
  const finalLabel = operationType === 'loading' ? 'Bruto' : 'Tara';

  const normalizeBrowserUrl = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return 'https://www.google.com';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  };

  const handleOpenWeb = async () => {
    const targetUrl = normalizeBrowserUrl(config.browserUrl);
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: targetUrl });
    } else {
      router.push(`/navegador?url=${encodeURIComponent(targetUrl)}`);
    }
  };

  const handleOpenFinalizedList = () => {
    router.push('/lista-fin');
  };

  return (
  <div 
    className="flex flex-col h-[100dvh] bg-background max-w-7xl mx-auto overflow-hidden"
    id="scale-calculator-printable-area"
  >
    {/* ==================== SETTINGS DIALOG ==================== */}
    <SettingsDialog
      isOpen={isSettingsOpen}
      onOpenChange={setIsSettingsOpen}
      scaleConfig={config}
      onScaleConfigChange={setConfig}
      onSave={saveConfig}
    />

    {/* ==================== TOPO FIXO ==================== */}
    <ScaleCalculatorTopBar
      appTitle={theme.appTitle}
      titleFontSize={theme.titleFontSize}
      titleFontFamily={theme.titleFontFamily}
      settingsButtonBg={theme.colors.settingsButtonBg}
      currentSessionId={currentSessionId}
      onSessionSelect={(session) => {
        setHasConfirmedOperationType(true);
        handleSessionSelect(session);
      }}
      onNewSession={(session) => {
        setHasConfirmedOperationType(Boolean(session.operationConfirmed));
        handleNewSession(session);
      }}
      onSessionsChange={refreshSessions}
      sessionsRevision={sessionsRevision}
      liveWeight={liveWeight}
      onWeightCopied={(weightText) => {
        setPendingCopiedWeight(weightText);
        toast({ title: "Peso copiado", description: "Agora toque em um campo de peso para colar automaticamente." });
      }}
      onOpenWeb={handleOpenWeb}
      onOpenSettings={() => setIsSettingsOpen(true)}
      status={status}
      operationType={operationType}
      onOperationTypeChange={(type) => {
        setOperationType(type);
        setHasConfirmedOperationType(true);
      }}
      compactMode={isAnyInputFocused}
    />

    {/* ==================== MEIO ROLÁVEL ==================== */}
    <div className="js-scale-scroll-area flex-1 overflow-y-auto print:overflow-visible px-2 py-2 sm:px-2.5 sm:py-2.5">
      
      {/* Card Cliente / Motorista / Placa / Peso Inicial */}
      <ScaleSessionHeaderCard
        headerData={headerData}
        onHeaderChange={handleHeaderChange}
        initialLabel={initialLabel}
        finalLabel={finalLabel}
        initialWeightValue={initialWeightValue}
        onInitialWeightChange={handleInitialWeightChange}
        onInitialWeightFetch={handleInitialWeightFetch}
        onInitialWeightFocus={() => handleWeightInputFocus({ type: 'initial' })}
        isInitialWeightLocked={isInitialWeightLocked}
        hasPendingCopiedWeight={Boolean(pendingCopiedWeight)}
      />

      {/* Caçambas */}
      {weighingSets.map((set, setIndex) => {
        return (
          <WeighingSetCard
            key={set.id}
            set={set}
            setIndex={setIndex}
            operationType={operationType}
            onSetNameChange={handleSetNameChange}
            onToggleSetCollapse={toggleSetCollapse}
            onToggleSetVisibility={toggleSetVisibility}
            onSetTitlePointerUp={handleSetTitlePointerUp}
            onRemoveSet={removeSet}
            onAddMaterial={addNewMaterial}
            onMaterialChange={handleMaterialChange}
            onInputChange={handleInputChange}
            onFetchLiveWeight={handleFetchLiveWeight}
            onWeightInputFocus={handleWeightInputFocus}
            hasPendingCopiedWeight={Boolean(pendingCopiedWeight)}
            onRemoveMaterial={removeMaterial}
            onCacambaDiscount={handleCacambaDiscount}
            onReclassifyMaterial={handleReclassifyMaterial}
            onReclassWeightChange={handleReclassWeightChange}
          />
        );
      })}

      {/* Botão Adicionar Caixa */}
      <div className="flex justify-center my-2 print:hidden">
        <Button
          variant="secondary"
          onClick={addNewSet}
          size="sm"
          className="button-3d h-10 rounded-xl px-4 sm:px-5 text-sm font-semibold border border-border/60"
        >
          <Tractor className="mr-2 h-4 w-4" /> + Adicionar Caixa
        </Button>
      </div>
    </div>

    {/* ==================== RODAPÉ FIXO ==================== */}
    <ScaleCalculatorFooter
      grandTotalLiquido={grandTotalLiquido}
      onClear={() => handleClear(false)}
      onSave={() => handleSave(currentSessionId, currentSessionUpdatedAt, headerData, operationType)}
      onFinalize={handleFinalizeWithPdf}
      onOpenFinalizedList={handleOpenFinalizedList}
      onPrint={handlePrint}
      sessionStatus={sessionStatus}
      currentSessionId={currentSessionId}
      compactMode={isAnyInputFocused}
    />
  </div>
);

});

ScaleCalculator.displayName = 'ScaleCalculator';

export default ScaleCalculator;