
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "./ui/table";
import { PlusCircle, Tractor, ArrowDownToLine, ArrowUpFromLine, Trash2, Save, Printer, Weight, PenSquare, Signal, Network, Settings } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { useScale } from "@/hooks/use-scale";
import { LiveScaleInfo } from "./LiveScaleInfo";
import { SettingsDialog } from "./SettingsDialog";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { format } from "date-fns";

type WeighingItem = {
  id: string;
  material: string;
  bruto: number;
  tara: number;
  descontos: number;
  liquido: number;
};

type WeighingSet = {
  id: string;
  name: string;
  items: WeighingItem[];
  descontoCacamba: number;
};

type OperationType = 'loading' | 'unloading';

const initialItem: WeighingItem = { id: '', material: '', bruto: 0, tara: 0, descontos: 0, liquido: 0 };
const initialWeighingSet: WeighingSet = { id: uuidv4(), name: "CAÇAMBA 1", items: [], descontoCacamba: 0 };

const formatNumber = (num: number) => {
  if (isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat('pt-BR', {useGrouping: false}).format(num);
};

// --- New WeightInput Component ---
interface WeightInputProps {
  value: number;
  onChange: (value: string) => void;
  onFetch: () => void;
  placeholder?: string;
  className?: string;
}

const WeightInput = ({ value, onChange, onFetch, placeholder, className }: WeightInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = () => {
    pressTimer.current = setTimeout(() => {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }, 500); // 500ms for long press
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      e.preventDefault(); // Prevent focus on short click
      onFetch();
    }
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <div className={cn("relative w-full", className)}>
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          placeholder={placeholder || "0"}
          value={isEditing ? value || '' : formatNumber(value)}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          className={cn("text-right h-8 print:hidden w-full", {
            'cursor-pointer': !isEditing
          })}
        />
        <span className="hidden print:block text-right print:text-black">{formatNumber(value)}</span>
    </div>
  );
};


const ScaleCalculator = forwardRef((props, ref) => {
  const { weight: liveWeight, status, connectionType, config, setConfig, saveConfig } = useScale();
  const { theme, setTheme } = useTheme();
  const [headerData, setHeaderData] = useState({ client: "", plate: "", driver: "" });
  const [weighingSets, setWeighingSets] = useState<WeighingSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<OperationType>('loading');
  const [weighingId, setWeighingId] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const generateWeighingId = () => format(new Date(), 'ddMMyyHHmm');

  const clearState = (isInitial = false) => {
    const newId = uuidv4();
    const newWeighingSet: WeighingSet = { ...initialWeighingSet, id: newId, items: [] };
    
    setWeighingSets([{...newWeighingSet, name: 'CAÇAMBA 1', items: []}]);
    setActiveSetId(newId);
    setHeaderData({ client: "", plate: "", driver: "" });
    setOperationType('loading');
    setWeighingId(generateWeighingId());

    if (!isInitial) {
      toast({ title: "Limpo!", description: "Todos os campos foram resetados." });
    }
  };


  useEffect(() => {
    const savedData = localStorage.getItem("scaleData");
    if (savedData) {
      try {
        const { weighingId: savedId, weighingSets: savedSets, headerData: savedHeader, operationType: savedOpType } = JSON.parse(savedData);
        
        if (!savedSets || savedSets.length === 0 || !savedSets.every((s: any) => s.id && s.name && Array.isArray(s.items))) {
            clearState(true);
            return;
        }

        setWeighingId(savedId || generateWeighingId());
        setWeighingSets(savedSets);
        setHeaderData(savedHeader || { client: "", plate: "", driver: "" });
        setOperationType(savedOpType || 'loading');
        
        if (savedSets.length > 0) {
            setActiveSetId(savedSets[0]?.id);
        } else {
            clearState(true);
        }

      } catch (e) {
        clearState(true);
      }
    } else {
      clearState(true);
    }
  }, []);

  useEffect(() => {
    if (weighingSets.length > 0 && !weighingSets.find(s => s.id === activeSetId)) {
      setActiveSetId(weighingSets[0].id);
    }
  }, [weighingSets, activeSetId]);


  const handleHeaderChange = (field: keyof typeof headerData, value: string) => {
    if (field === 'plate') {
        let formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
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
             const firstItem = newItems[0];
             for(let i=1; i<newItems.length; i++) {
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
            item.id === itemId ? { ...item, material: newMaterial.toUpperCase() } : item
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
    setWeighingSets(prevSets =>
      prevSets.map(set => {
        if (set.id === setId) {
          const lastItem = set.items[set.items.length - 1];
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
            };
          } else { // Compra - Descarregamento
            newItem = {
              id: uuidv4(),
              material: "",
              bruto: lastItem?.tara ?? initialWeight,
              tara: 0,
              descontos: 0,
              liquido: 0,
            };
          }
           
          return { ...set, items: [...set.items, newItem] };
        }
        return set;
      })
    );
  };
  
  const addNewSet = () => {
    const newSetNumber = weighingSets.length + 1;
    const newSet: WeighingSet = {
        id: uuidv4(),
        name: `CAÇAMBA ${newSetNumber}`,
        items: [],
        descontoCacamba: 0
    };

    setWeighingSets(prev => [...prev, newSet]);
    setActiveSetId(newSet.id);
  };

  const removeSet = (setId: string) => {
    setWeighingSets(prev => {
        const newSets = prev.filter(s => s.id !== setId);
        if (newSets.length === 0) {
            const newId = uuidv4();
            const renumberedSets = [{ ...initialWeighingSet, id: newId, name: 'CAÇAMBA 1', items: [] }];
            setActiveSetId(newId);
            return renumberedSets;
        }
        
        const renumberedSets = newSets.map((s, index) => ({
            ...s,
            name: `CAÇAMBA ${index + 1}`
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
                const newItems = set.items.filter(item => item.id !== itemId);
                return { ...set, items: newItems };
            }
            return set;
        })
    );
  };

  const handleClear = (isInitialLoad = false) => {
    clearState(isInitialLoad);
  };

  const handleSave = () => {
      try {
        localStorage.setItem("scaleData", JSON.stringify({weighingId, weighingSets, headerData, operationType}));
        toast({ title: "Pesagem Salva!", description: "Os dados da pesagem foram salvos localmente." });
      } catch (e) {
        toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível salvar os dados." });
      }
  };

  const handleLoad = () => {
      try {
          const savedData = localStorage.getItem("scaleData");
          if (savedData) {
              const { weighingId, weighingSets, headerData, operationType } = JSON.parse(savedData);
              setWeighingId(weighingId || generateWeighingId());
              setWeighingSets(weighingSets);
              setHeaderData(headerData || { client: "", plate: "", driver: "" });
              setOperationType(operationType || 'loading');
              setActiveSetId(weighingSets[0]?.id || null);
              toast({ title: "Dados Carregados", description: "A última pesagem salva foi carregada." });
          } else {
              toast({ variant: "destructive", title: "Nenhum Dado Salvo", description: "Não há dados de pesagem salvos para carregar." });
          }
      } catch (e) {
          toast({ variant: "destructive", title: "Erro ao Carregar", description: "Não foi possível carregar os dados." });
      }
  };

  const handlePrint = () => {
    try {
        localStorage.setItem("scaleData", JSON.stringify({ weighingId, weighingSets, headerData, operationType }));
        window.open('/balanca', '_blank');
    } catch (e) {
        toast({ variant: "destructive", title: "Erro ao Imprimir", description: "Não foi possível preparar os dados para impressão." });
    }
  };

  const handleFetchLiveWeight = (callback: (weight: string) => void) => {
    if (status !== 'connected') {
      toast({
        variant: "destructive",
        title: "Balança não conectada",
        description: "Verifique a conexão com a balança.",
      });
      return;
    }
    callback(liveWeight.toString());
    toast({ title: "Peso Capturado!", description: `Peso de ${liveWeight}kg capturado.` });
  };

  useImperativeHandle(ref, () => ({
    handleClear,
    handleSave,
    handleLoad,
    handlePrint,
  }));
  
  const grandTotalLiquido = weighingSets.reduce((total, set) => {
    const setItemsTotal = set.items.reduce((acc, item) => acc + item.liquido, 0);
    return total + (setItemsTotal - set.descontoCacamba);
  }, 0);

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

  const handleInitialWeightChange = (value: string) => {
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

  const handleInitialWeightFetch = () => {
     handleFetchLiveWeight((weight) => {
        handleInitialWeightChange(weight);
     });
  }

  const activeSet = weighingSets.find(s => s.id === activeSetId) || firstSet;
  const initialLabel = operationType === 'loading' ? 'Tara' : 'Bruto';
  const finalLabel = operationType === 'loading' ? 'Bruto' : 'Tara';
  
    const getStatusColor = () => {
        switch(status) {
            case 'connected':
                return 'bg-green-500';
            case 'connecting':
                return 'bg-yellow-500';
            case 'error':
            case 'disconnected':
                return 'bg-red-500';
            default:
                return 'bg-muted-foreground';
        }
    }

  return (
    <div className="bg-background max-w-7xl mx-auto" id="scale-calculator-printable-area">
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        scaleConfig={config}
        onScaleConfigChange={setConfig}
        onSave={saveConfig}
      />
      <div className="sticky top-0 z-10 bg-background py-1 print:hidden">
        <div className="mb-4 print:hidden text-center">
            <h2 
                className="font-bold"
                style={{
                    fontSize: `${theme.titleFontSize}px`,
                    fontFamily: `'${theme.titleFontFamily}', sans-serif`,
                }}
            >
                {theme.appTitle}
            </h2>
        </div>
        <div className="flex justify-between items-center mb-4 print:hidden gap-1">
            <div className="flex-grow">
            <LiveScaleInfo 
                status={status}
                weight={liveWeight}
            />
            </div>
            <div className="flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="outline"
                            size="icon" 
                            className="h-10 w-10 relative" 
                            onClick={() => setIsSettingsOpen(true)}
                            style={{ backgroundColor: theme.colors.settingsButtonBg }}
                        >
                            <span className={cn("absolute top-0.5 right-0.5 block h-3 w-3 rounded-full border-2", getStatusColor())} style={{ borderColor: theme.colors.settingsButtonBg }}/>
                            <Settings className="h-5 w-5"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Configurações</p>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="flex items-center gap-px rounded-full border bg-muted p-0.5 print:hidden">
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant={operationType === 'loading' ? 'default' : 'ghost'} size="default" className="h-10 w-16 rounded-full p-2" onClick={() => setOperationType('loading')}>
                        <ArrowUpFromLine className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Carregamento (Venda / Saída de Material)</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant={operationType === 'unloading' ? 'default' : 'ghost'} size="default" className="h-10 w-16 rounded-full p-2" onClick={() => setOperationType('unloading')}>
                        <ArrowDownToLine className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Descarregamento (Compra / Entrada de Material)</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                </div>
            </div>
        </div>
      </div>


      <Card className="mb-px print:border-none print:shadow-none print:p-0">
        <CardContent className="p-0">
          <div className="w-full space-y-0.5">
            <div className="flex justify-between items-end pb-0.5">
                <Label htmlFor="cliente" className="font-semibold text-sm md:text-base">Cliente</Label>
                <div className="flex items-center text-sm text-muted-foreground font-medium">
                  <span className="w-28 text-center">{initialLabel}</span>
                  <span className="w-28 text-center">{finalLabel}</span>
                </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <Input id="cliente" value={headerData.client} onChange={e => handleHeaderChange('client', e.target.value)} className="h-8 print:hidden"/>
              <span className="hidden print:block print:text-black">{headerData.client || 'N/A'}</span>
              
              <div className="flex w-full items-end gap-0.5 text-xs sm:text-sm flex-nowrap">
                <div className="space-y-px flex-1 min-w-0">
                  <Label htmlFor="motorista" className="text-xs sm:text-sm">Motorista</Label>
                  <Input id="motorista" value={headerData.driver} onChange={e => handleHeaderChange('driver', e.target.value)} className="h-8 print:hidden text-sm"/>
                  <span className="hidden print:block print:text-black">{headerData.driver || 'N/A'}</span>
                </div>
                <div className="space-y-px flex-none w-24">
                  <Label htmlFor="placa" className="text-xs sm:text-sm">Placa</Label>
                  <Input id="placa" value={headerData.plate} onChange={e => handleHeaderChange('plate', e.target.value)} className="h-8 print:hidden text-sm text-center"/>
                  <span className="hidden print:block print:text-black">{headerData.plate || 'N/A'}</span>
                </div>
                 <div className="space-y-px flex-none w-28">
                    <Label className="text-xs sm:text-sm text-center block w-full">Peso Inicial</Label>
                    <WeightInput 
                        value={initialWeightValue}
                        onChange={handleInitialWeightChange}
                        onFetch={handleInitialWeightFetch}
                    />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {weighingSets.map((set, setIndex) => {
         const subtotalLiquido = set.items.reduce((acc, item) => acc + item.liquido, 0);
         const totalLiquidoSet = subtotalLiquido - set.descontoCacamba;

         return (
          <Card key={set.id} className="mb-px print:border-none print:shadow-none print:p-0 print:mb-0.5">
            <CardHeader className="p-px flex flex-row items-center justify-between print:p-0 print:mb-0.5">
                <div className="flex items-center gap-2">
                    <Input 
                        value={set.name}
                        onChange={(e) => handleSetNameChange(set.id, e.target.value)}
                        className="text-xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 h-auto w-48 text-cacamba-foreground"
                    />
                    {setIndex > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => removeSet(set.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive print:hidden">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Remover Caçamba</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => addNewMaterial(set.id)} className="h-8 w-8 print:hidden">
                            <PlusCircle className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Adicionar Material</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {/* Mobile Layout */}
              <div className="sm:hidden">
                  {set.items.map((item) => {
                      return (
                      <div key={item.id} className="border-b p-0.5 space-y-0.5">
                          <div className="flex items-end gap-1">
                            <div className="space-y-px flex-grow">
                              <Label className="text-xs text-muted-foreground">Material</Label>
                              <Input
                                placeholder="SUCATA"
                                value={item.material}
                                onChange={(e) => handleMaterialChange(set.id, item.id, e.target.value)}
                                className="w-full justify-between h-8"
                              />
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => removeMaterial(set.id, item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive print:hidden">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Remover Material</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="grid grid-cols-4 gap-0.5">
                              <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Bruto (kg)</Label>
                                  <WeightInput 
                                      value={item.bruto}
                                      onChange={(value) => handleInputChange(set.id, item.id, 'bruto', value)}
                                      onFetch={() => handleFetchLiveWeight((w) => handleInputChange(set.id, item.id, 'bruto', w))}
                                  />
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Tara (kg)</Label>
                                  <WeightInput 
                                      value={item.tara}
                                      onChange={(value) => handleInputChange(set.id, item.id, 'tara', value)}
                                      onFetch={() => handleFetchLiveWeight((w) => handleInputChange(set.id, item.id, 'tara', w))}
                                  />
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">A/L (kg)</Label>
                                  <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.descontos)} onChange={(e) => handleInputChange(set.id, item.id, 'descontos', e.target.value)} className="text-right h-8 print:hidden w-full" />
                                   <span className="hidden print:block text-right print:text-black">{formatNumber(item.descontos)}</span>
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Líquido (kg)</Label>
                                  <div className="h-8 flex items-center justify-end font-semibold">
                                      <span className="print:text-black">{formatNumber(item.liquido)}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
              {/* Desktop Layout */}
              <Table className="hidden sm:table table-fixed">
                <TableHeader>
                   <TableRow className="print:text-black">
                    <TableHead className="w-auto">Material</TableHead>
                    <TableHead className="text-right w-[16%]">Bruto (kg)</TableHead>
                    <TableHead className="text-right w-[16%]">Tara (kg)</TableHead>
                    <TableHead className="text-right w-[16%]">A/L (kg)</TableHead>
                    <TableHead className="text-right font-semibold w-[16%]">Líquido (kg)</TableHead>
                    <TableHead className="w-[5%] print:hidden"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {set.items.map((item, itemIndex) => {                      
                      return (
                    <TableRow key={item.id} className="print:text-black">
                      <TableCell className="font-medium p-0 sm:p-px">
                           <Input
                              placeholder="SUCATA"
                              value={item.material}
                              onChange={(e) => handleMaterialChange(set.id, item.id, e.target.value)}
                              className="w-full justify-between h-8"
                            />
                      </TableCell>
                      <TableCell className="p-0 sm:p-px">
                           <WeightInput 
                                value={item.bruto}
                                onChange={(value) => handleInputChange(set.id, item.id, 'bruto', value)}
                                onFetch={() => handleFetchLiveWeight((w) => handleInputChange(set.id, item.id, 'bruto', w))}
                            />
                      </TableCell>
                      <TableCell className="p-0 sm:p-px">
                            <WeightInput 
                                value={item.tara}
                                onChange={(value) => handleInputChange(set.id, item.id, 'tara', value)}
                                onFetch={() => handleFetchLiveWeight((w) => handleInputChange(set.id, item.id, 'tara', w))}
                            />
                      </TableCell>
                      <TableCell className="p-0 sm:p-px">
                            <div className="flex justify-end">
                                <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={formatNumber(item.descontos)}
                                onChange={(e) => handleInputChange(set.id, item.id, 'descontos', e.target.value)}
                                className="text-right h-8 print:hidden w-full"
                                />
                            </div>
                            <span className="hidden print:block text-right print:text-black">{formatNumber(item.descontos)}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold p-0 sm:p-px">
                            <div className="h-8 sm:h-full flex items-center justify-end">
                                <span className="print:text-black">{formatNumber(item.liquido)}</span>
                            </div>
                      </TableCell>
                      <TableCell className="p-0 sm:p-px text-center print:hidden">
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => removeMaterial(set.id, item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Remover Material</p></TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </CardContent>
            <CardContent className="p-px border-t print:border-t print:border-border print:p-0 print:pt-0.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1">
                     <div className="flex items-center gap-0.5">
                         <Label htmlFor={`desconto-cacamba-${set.id}`} className="shrink-0 text-sm md:text-base">Desconto (kg)</Label>
                         <Input
                             id={`desconto-cacamba-${set.id}`}
                             type="text"
                             inputMode="decimal"
                             placeholder="0"
                             value={formatNumber(set.descontoCacamba)}
                             onChange={(e) => handleCacambaDiscount(set.id, e.target.value)}
                             className="h-8 text-right print:hidden flex-1 min-w-[90px] w-14"
                          />
                          <span className="hidden print:block font-semibold print:text-black">{formatNumber(set.descontoCacamba)}</span>
                     </div>
                     <div className="text-right flex-shrink-0">
                         <p className="text-sm text-muted-foreground">Subtotal</p>
                         <p className="text-lg font-bold print:text-black">{formatNumber(subtotalLiquido)} kg</p>
                     </div>
                      <div className="text-right flex-shrink-0">
                         <p className="text-sm text-muted-foreground">{set.name}</p>
                         <p className="text-xl font-bold text-primary print:text-black">{formatNumber(totalLiquidoSet)} kg</p>                     </div>
                 </div>
            </CardContent>
          </Card>
        );
      })}

      
        <div className="flex justify-center my-px print:hidden">
          <Button variant="secondary" onClick={addNewSet} size="sm" className="h-8 px-2"><Tractor className="mr-2 h-4 w-4" /> + Adicionar Caçamba</Button>
        </div>
      

      <Card className="mt-px bg-accent-price/10 border-accent-price/20 print:border print:border-accent-price print:shadow-none print:p-0.5">
         <CardContent className="p-px flex justify-end items-center">
             <div className="text-right">
                <p className="text-lg font-semibold text-accent-price print:text-2xl print:mb-0.5">Peso Líquido Total</p>
                <p className="text-4xl font-bold text-accent-price print:text-black">{new Intl.NumberFormat('pt-BR').format(grandTotalLiquido)} kg</p>
            </div>
         </CardContent>
      </Card>
      <div className="flex items-center justify-center pt-1 print:hidden gap-16">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => handleClear(false)} variant="outline" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent><p>Limpar Tudo</p></TooltipContent>
          </Tooltip>
            <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleSave} variant="outline" size="icon" className="h-8 w-8"><Save className="h-4 w-4"/></Button>
            </TooltipTrigger>
            <TooltipContent><p>Salvar Pesagem</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleLoad} variant="outline" size="icon" className="h-8 w-8"><ArrowUpFromLine className="h-4 w-4"/></Button>
            </TooltipTrigger>
            <TooltipContent><p>Carregar Última Pesagem</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handlePrint} variant="outline" size="icon" className="h-8 w-8"><Printer className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent><p>Imprimir / Salvar PDF</p></TooltipContent>          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});
ScaleCalculator.displayName = 'ScaleCalculator';

export default ScaleCalculator;
