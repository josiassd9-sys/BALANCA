"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "./ui/table";
import { PlusCircle, Tractor, ArrowDownToLine, ArrowUpFromLine, Trash2, Save, Printer, Weight, Loader2, PenSquare, CircuitBoard } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, onSnapshot, DocumentData } from "firebase/firestore";

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
type WeighingMode = 'manual' | 'electronic';

const initialItem: WeighingItem = { id: '', material: '', bruto: 0, tara: 0, descontos: 0, liquido: 0 };
const initialWeighingSet: WeighingSet = { id: uuidv4(), name: "CAÇAMBA 1", items: [], descontoCacamba: 0 };

const ScaleCalculator = forwardRef((props, ref) => {
  const [headerData, setHeaderData] = useState({ client: "", plate: "", driver: "" });
  const [weighingSets, setWeighingSets] = useState<WeighingSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<OperationType>('loading');
  const [weighingMode, setWeighingMode] = useState<WeighingMode>('manual');
  
  const [liveWeight, setLiveWeight] = useState<number>(0);
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  
  const firestore = useFirestore();

  useEffect(() => {
    let savedData;
    try {
      savedData = localStorage.getItem("scaleData");
    } catch (e) {
      console.error("Could not read from localStorage.", e);
    }
  
    if (savedData) {
      try {
        const { weighingSets: savedSets, headerData: savedHeader, operationType: savedOpType } = JSON.parse(savedData);
        
        if (Array.isArray(savedSets) && savedSets.length > 0) {
           setWeighingSets(savedSets);
           setActiveSetId(savedSets[0]?.id);
        } else {
            const newSet = { ...initialWeighingSet, id: uuidv4(), items: [] };
            setWeighingSets([newSet]);
            setActiveSetId(newSet.id);
        }

        if (savedHeader) setHeaderData(savedHeader);
        if (savedOpType) setOperationType(savedOpType);

      } catch (e) {
        console.error("Failed to parse saved data.", e);
        const newSet = { ...initialWeighingSet, id: uuidv4(), items: [] };
        setWeighingSets([newSet]);
        setActiveSetId(newSet.id);
      }
    } else {
      const newSet = { ...initialWeighingSet, id: uuidv4(), items: [] };
      setWeighingSets([newSet]);
      setActiveSetId(newSet.id);
    }
  }, []);

  useEffect(() => {
    if (weighingMode !== 'electronic' || !firestore) {
      setIsScaleConnected(false);
      return;
    }

    const scaleDataQuery = query(collection(firestore, 'pesagens'), orderBy('timestamp', 'desc'), limit(1));

    const unsubscribe = onSnapshot(scaleDataQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        const latestWeight = latestDoc.data().peso;
        if (typeof latestWeight === 'number') {
          setLiveWeight(latestWeight);
          setIsScaleConnected(true);
        }
      } else {
        setIsScaleConnected(false);
      }
    }, (error) => {
      console.error("Error fetching live weight from Firestore:", error);
      setIsScaleConnected(false);
      toast({
        variant: "destructive",
        title: "Erro de Leitura",
        description: "Não foi possível ler o peso da balança via Firestore."
      });
    });

    return () => unsubscribe();
  }, [weighingMode, firestore, toast]);

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
    setWeighingSets(prevSets =>
      prevSets.map(set => {
        if (set.id === setId) {
          const newItems = set.items.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: numValue };
              const bruto = updatedItem.bruto;
              const tara = updatedItem.tara;
              const descontos = updatedItem.descontos;
              updatedItem.liquido = bruto - tara - descontos;
              return updatedItem;
            }
            return item;
          });
          return { ...set, items: newItems };
        }
        return set;
      })
    );
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
    setWeighingSets(prevSets => {
        const newSets = JSON.parse(JSON.stringify(prevSets));
        const setIndex = newSets.findIndex((s: WeighingSet) => s.id === setId);
        if (setIndex === -1) return prevSets;

        const currentSet = newSets[setIndex];
        const visibleItems = currentSet.items.filter((item: WeighingItem) => item.material !== "PESO_INICIAL_CAMINHAO");
        const lastVisibleItem = visibleItems[visibleItems.length - 1];
        
        const firstSet = newSets[0];
        const initialWeightItem = firstSet?.items.find((item: WeighingItem) => item.material === "PESO_INICIAL_CAMINHAO");
        const truckWeight = initialWeightItem?.[operationType === 'loading' ? 'tara' : 'bruto'] ?? 0;

        let newItem: WeighingItem;

        if (visibleItems.length === 0) {
             newItem = {
                id: uuidv4(),
                material: "SUCATA",
                bruto: operationType === 'loading' ? 0 : truckWeight,
                tara: operationType === 'loading' ? truckWeight : 0,
                descontos: 0,
                liquido: 0,
            };
        } else if (lastVisibleItem) {
            if (operationType === 'loading') {
                newItem = {
                    id: uuidv4(),
                    material: "SUCATA",
                    bruto: 0,
                    tara: lastVisibleItem.bruto,
                    descontos: 0,
                    liquido: 0,
                };
            } else { 
                newItem = {
                    id: uuidv4(),
                    material: "SUCATA",
                    bruto: lastVisibleItem.tara,
                    tara: 0,
                    descontos: 0,
                    liquido: 0,
                };
            }
        } else {
            newItem = { id: uuidv4(), material: 'SUCATA', bruto: 0, tara: 0, descontos: 0, liquido: 0 };
        }
        
        newItem.liquido = newItem.bruto - newItem.tara - newItem.descontos;
        currentSet.items.push(newItem);
        return newSets;
    });
};
  
  const addBitrem = () => {
    if (weighingSets.length >= 2) return;

    const firstSet = weighingSets[0];
    
    if (!firstSet || !firstSet.items.find(item => item.material === "PESO_INICIAL_CAMINHAO")) {
        toast({
            variant: "destructive",
            title: "Peso Inicial Necessário",
            description: "Insira o peso inicial do caminhão antes de adicionar o bitrem.",
        });
        return;
    }

    const newSet: WeighingSet = {
        id: uuidv4(),
        name: "BITREM / CAÇAMBA 2",
        items: [],
        descontoCacamba: 0
    };

    setWeighingSets(prev => [...prev, newSet]);
    setActiveSetId(newSet.id);
  };

  const handleClear = () => {
    const newWeighingSet: WeighingSet = { ...initialWeighingSet, id: uuidv4(), items: [] };
    setWeighingSets([newWeighingSet]);
    setActiveSetId(newWeighingSet.id);
    setHeaderData({ client: "", plate: "", driver: "" });
  };

  const handleSave = () => {
      try {
        localStorage.setItem("scaleData", JSON.stringify({weighingSets, headerData, operationType}));
        toast({ title: "Pesagem Salva!", description: "Os dados da pesagem foram salvos localmente." });
      } catch (e) {
        toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível salvar os dados." });
      }
  };

  const handleLoad = () => {
      try {
          const savedData = localStorage.getItem("scaleData");
          if (savedData) {
              const { weighingSets, headerData, operationType } = JSON.parse(savedData);
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
        localStorage.setItem("scaleData", JSON.stringify({ weighingSets, headerData, operationType }));
        window.open('/balanca', '_blank');
    } catch (e) {
        toast({ variant: "destructive", title: "Erro ao Imprimir", description: "Não foi possível preparar os dados para impressão." });
    }
  };

  const handleFetchLiveWeight = (setId?: string, itemId?: string, field?: 'bruto' | 'tara') => {
    if (!isScaleConnected) {
        toast({ variant: "destructive", title: "Balança Desconectada", description: "Não é possível capturar o peso. Verifique a conexão com o Firestore." });
        return;
    }
    
    const weight = liveWeight;

    if (setId && itemId && field) {
      handleInputChange(setId, itemId, field, weight.toString());
      toast({ title: "Peso Capturado!", description: `Peso de ${weight}kg aplicado ao campo ${field}.` });
    } else {
      handleInitialWeightChange(weight.toString());
      toast({ title: "Peso Inicial Capturado!", description: `Peso de ${weight}kg aplicado.` });
    }
  };


  const handleInitialWeightChange = (value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    const initialWeightField = operationType === 'loading' ? 'tara' : 'bruto';

    setWeighingSets(prev => {
        const newSets = JSON.parse(JSON.stringify(prev)); // Deep copy
        
        if (newSets.length === 0) { // Should not happen, but as a safeguard
            newSets.push({ ...initialWeighingSet, id: uuidv4(), items: [] });
        }

        let initialItem = newSets[0].items.find((i: WeighingItem) => i.material === "PESO_INICIAL_CAMINHAO");

        if (!initialItem) {
            initialItem = { ...initialItem, id: uuidv4(), material: "PESO_INICIAL_CAMINHAO", bruto: 0, tara: 0, descontos: 0, liquido: 0 };
            newSets[0].items.unshift(initialItem); // Add to the beginning
        }

        // Update the weight on the hidden item
        initialItem[initialWeightField] = numValue;
        
        // Also update its counterpart to avoid negative liquid weight if bruto/tara is 0
        if (initialWeightField === 'tara') {
            initialItem.liquido = initialItem.bruto - numValue - initialItem.descontos;
        } else { // initialWeightField is 'bruto'
            initialItem.liquido = numValue - initialItem.tara - initialItem.descontos;
        }
        
        return newSets;
    });
};

  useImperativeHandle(ref, () => ({
    handleClear,
    handleSave,
    handleLoad,
    handlePrint,
  }));

  const formatNumber = (num: number) => {
    if (isNaN(num) || num === 0) return "";
    return new Intl.NumberFormat('pt-BR', {useGrouping: false}).format(num);
  };

  const formatNumberWithGroup = (num: number) => {
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat('pt-BR').format(num);
  }
  
  const grandTotalLiquido = weighingSets.reduce((total, set) => {
    const setItemsTotal = set.items
      .filter(item => item.material !== "PESO_INICIAL_CAMINHAO")
      .reduce((acc, item) => acc + item.liquido, 0);
    return total + (setItemsTotal - set.descontoCacamba);
  }, 0);

  const firstSet = weighingSets.length > 0 ? weighingSets[0] : null;
  const initialItemInState = firstSet?.items.find(item => item.material === "PESO_INICIAL_CAMINHAO");
  const initialWeightField = operationType === 'loading' ? 'tara' : 'bruto';
  const initialWeightValue = initialItemInState?.[initialWeightField] ?? 0;
  
  // Filter out the hidden initial item before rendering
  const visibleItems = (set: WeighingSet) => set.items.filter(item => item.material !== "PESO_INICIAL_CAMINHAO");

  return (
    <div className="p-px bg-background max-w-7xl mx-auto" id="scale-calculator-printable-area">
      <div className="flex justify-between items-center mb-4 px-2 print:hidden">
        <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Pesagem Avulsa</h2>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <ToggleGroup 
              type="single" 
              variant="outline"
              value={weighingMode} 
              onValueChange={(value) => {
                if (value) setWeighingMode(value as WeighingMode);
              }}
              className="p-1 gap-4"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="manual" aria-label="Manual">
                    <PenSquare className="h-5 w-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent><p>Pesagem Manual</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="electronic" aria-label="Eletrônica">
                    <CircuitBoard className="h-5 w-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent><p>Pesagem Eletrônica</p></TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </TooltipProvider>
        </div>
      </div>

      <Card className="mb-px print:border-none print:shadow-none print:p-0">
        <CardContent className="p-px print:p-0">
          <div className="w-full space-y-0.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="cliente" className="font-semibold text-sm md:text-base">Cliente</Label>
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
                    <Label className="text-xs sm:text-sm">{operationType === 'loading' ? 'Tara (kg)' : 'Bruto (kg)'}</Label>
                    {weighingMode === 'electronic' ? (
                        <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight()} disabled={!isScaleConnected}>
                            <span>{isScaleConnected ? (liveWeight || "Buscar") : <Loader2 className="h-4 w-4 animate-spin" />}</span>
                            {isScaleConnected ? <Weight className="h-4 w-4" /> : null}
                        </Button>
                    ) : (
                        <Input 
                            type="text" 
                            inputMode="decimal" 
                            placeholder="0" 
                            value={formatNumber(initialWeightValue)} 
                            onChange={(e) => handleInitialWeightChange(e.target.value)} 
                            className="text-right h-8 print:hidden w-full" 
                        />
                    )}
                    <span className="hidden print:block text-right print:text-black">{formatNumber(initialWeightValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {weighingSets.map((set, setIndex) => {
         const itemsToRender = visibleItems(set);
         const subtotalLiquido = itemsToRender.reduce((acc, item) => acc + item.liquido, 0);
         const totalLiquidoSet = subtotalLiquido - set.descontoCacamba;

         return (
          <Card key={set.id} className="mb-px print:border-none print:shadow-none print:p-0 print:mb-0.5">
            <CardHeader className="p-px flex flex-row items-center justify-between print:p-0 print:mb-0.5">
              <Input 
                value={set.name}
                onChange={(e) => handleSetNameChange(set.id, e.target.value)}
                className="text-xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 h-auto"
              />
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
            {itemsToRender.length > 0 && (
            <CardContent className="p-0 overflow-x-auto">
              {/* Mobile Layout */}
              <div className="sm:hidden">
                  {itemsToRender.map((item) => {
                      return (
                      <div key={item.id} className="border-b p-0.5 space-y-0.5">
                          <div className="space-y-px">
                            <Label className="text-xs text-muted-foreground">Material</Label>
                             <Input
                              value={item.material}
                              onChange={(e) => handleMaterialChange(set.id, item.id, e.target.value)}
                              className="w-full justify-between h-8"
                            />
                          </div>
                          <div className="grid grid-cols-4 gap-0.5">
                              <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Bruto (kg)</Label>
                                  {weighingMode === 'electronic' ? (
                                     <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'bruto')} disabled={!isScaleConnected}>
                                          <span>{isScaleConnected ? (formatNumber(item.bruto) || "Buscar") : <Loader2 className="h-4 w-4 animate-spin" />}</span>
                                          {isScaleConnected ? <Weight className="h-4 w-4" /> : null}
                                     </Button>
                                  ) : (
                                    <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.bruto)} onChange={(e) => handleInputChange(set.id, item.id, 'bruto', e.target.value)} className="text-right h-8 print:hidden w-full" />
                                  )}
                                   <span className="hidden print:block text-right print:text-black">{formatNumber(item.bruto)}</span>
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Tara (kg)</Label>
                                    {weighingMode === 'electronic' ? (
                                         <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'tara')} disabled={!isScaleConnected}>
                                              <span>{isScaleConnected ? (formatNumber(item.tara) || "Buscar") : <Loader2 className="h-4 w-4 animate-spin" />}</span>
                                              {isScaleConnected ? <Weight className="h-4 w-4" /> : null}
                                         </Button>
                                    ) : (
                                      <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.tara)} onChange={(e) => handleInputChange(set.id, item.id, 'tara', e.target.value)} className="text-right h-8 print:hidden w-full" />
                                    )}
                                   <span className="hidden print:block text-right print:text-black">{formatNumber(item.tara)}</span>
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">A/L (kg)</Label>
                                  <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.descontos)} onChange={(e) => handleInputChange(set.id, item.id, 'descontos', e.target.value)} className="text-right h-8 print:hidden w-full" />
                                   <span className="hidden print:block text-right print:text-black">{formatNumber(item.descontos)}</span>
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Líquido (kg)</Label>
                                  <div className="h-8 flex items-center justify-end font-semibold">
                                      <span className="print:text-black">{formatNumberWithGroup(item.liquido)}</span>
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
                    <TableHead className="w-[30%]">Material</TableHead>
                    <TableHead className="text-right w-[17.5%]">Bruto (kg)</TableHead>
                    <TableHead className="text-right w-[17.5%]">Tara (kg)</TableHead>
                    <TableHead className="text-right w-[17.5%]">A/L (kg)</TableHead>
                    <TableHead className="text-right font-semibold w-[17.5%]">Líquido (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsToRender.map((item) => {
                      return (
                    <TableRow key={item.id} className="print:text-black">
                      <TableCell className="w-[30%] font-medium p-0 sm:p-px">
                           <Input
                              value={item.material}
                              onChange={(e) => handleMaterialChange(set.id, item.id, e.target.value)}
                              className="w-full justify-between h-8"
                            />
                      </TableCell>
                      <TableCell className="w-[17.5%] p-0 sm:p-px">
                            <div className="flex items-center justify-end gap-1">
                                {weighingMode === 'electronic' ? (
                                    <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'bruto')} disabled={!isScaleConnected}>
                                        <span>{isScaleConnected ? (formatNumber(item.bruto) || "Buscar Peso") : <Loader2 className="h-4 w-4 animate-spin" />}</span>
                                        {isScaleConnected ? <Weight className="h-4 w-4" /> : null}
                                    </Button>
                                ) : (
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={formatNumber(item.bruto)}
                                    onChange={(e) => handleInputChange(set.id, item.id, 'bruto', e.target.value)}
                                    className="text-right h-8 print:hidden w-24"
                                  />
                                )}
                            </div>
                            <span className="hidden print:block text-right print:text-black">{formatNumber(item.bruto)}</span>
                      </TableCell>
                      <TableCell className="w-[17.5%] p-0 sm:p-px">
                            <div className="flex items-center justify-end gap-1">
                                {weighingMode === 'electronic' ? (
                                    <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'tara')} disabled={!isScaleConnected}>
                                        <span>{isScaleConnected ? (formatNumber(item.tara) || "Buscar Peso") : <Loader2 className="h-4 w-4 animate-spin" />}</span>
                                        {isScaleConnected ? <Weight className="h-4 w-4" /> : null}
                                    </Button>
                                ) : (
                                  <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={formatNumber(item.tara)}
                                  onChange={(e) => handleInputChange(set.id, item.id, 'tara', e.target.value)}
                                  className="text-right h-8 print:hidden w-24"
                                  />
                                )}
                            </div>
                            <span className="hidden print:block text-right print:text-black">{formatNumber(item.tara)}</span>
                      </TableCell>
                      <TableCell className="w-[17.5%] p-0 sm:p-px">
                            <div className="flex justify-end">
                                <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={formatNumber(item.descontos)}
                                onChange={(e) => handleInputChange(set.id, item.id, 'descontos', e.target.value)}
                                className="text-right h-8 print:hidden w-24"
                                />
                            </div>
                            <span className="hidden print:block text-right print:text-black">{formatNumber(item.descontos)}</span>
                      </TableCell>
                      <TableCell className="w-[17.5%] text-right font-semibold p-0 sm:p-px">
                            <div className="h-8 sm:h-full flex items-center justify-end">
                                <span className="print:text-black">{formatNumberWithGroup(item.liquido)}</span>
                            </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </CardContent>
            )}
            <CardContent className="p-px border-t print:border-t print:border-border print:p-0 print:pt-0.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1">
                     <div className="flex items-center gap-0.5">
                         <Label htmlFor={`desconto-cacamba-${set.id}`} className="shrink-0 text-sm md:text-base">Caçamba (kg)</Label>
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
                         <p className="text-lg font-bold print:text-black">{formatNumberWithGroup(subtotalLiquido)} kg</p>
                     </div>
                      <div className="text-right flex-shrink-0">
                         <p className="text-sm text-muted-foreground">{setIndex === 0 ? "Caçamba 1" : "Bitrem / Caçamba 2"}</p>
                         <p className="text-xl font-bold text-primary print:text-black">{formatNumberWithGroup(totalLiquidoSet)} kg</p>
                     </div>
                 </div>
            </CardContent>
          </Card>
        );
      })}

      {weighingSets.length < 2 && (
        <div className="flex justify-center my-px print:hidden">
          <Button variant="secondary" onClick={addBitrem} size="sm" className="h-8 px-2"><Tractor className="mr-2 h-4 w-4" /> + Bitrem / Caçamba 2</Button>
        </div>
      )}

      <Card className="mt-px bg-primary/10 border-primary/20 print:border print:border-accent-price print:shadow-none print:p-0.5">
         <CardContent className="p-px flex justify-end items-center">
             <div className="text-right">
                <p className="text-lg font-semibold text-primary print:text-2xl print:mb-0.5">Peso Líquido Total</p>
                <p className="text-4xl font-bold text-primary print:text-black">{new Intl.NumberFormat('pt-BR').format(grandTotalLiquido)} kg</p>
            </div>
         </CardContent>
      </Card>
      <div className="flex items-center gap-4 justify-center pt-1 print:hidden">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleClear} variant="outline" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
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
            <TooltipContent><p>Imprimir / Salvar PDF</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});
ScaleCalculator.displayName = 'ScaleCalculator';

export default ScaleCalculator;
