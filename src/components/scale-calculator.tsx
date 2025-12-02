
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "./ui/table";
import { PlusCircle, Tractor, ArrowDownToLine, ArrowUpFromLine, Trash2, Save, Printer, Weight, PenSquare, Signal, Network } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { useScale } from "@/hooks/use-scale";
import { LiveScaleInfo } from "./LiveScaleInfo";
import { NetworkSettingsDialog } from "./NetworkSettingsDialog";

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

const initialItem: WeighingItem = { id: '', material: 'SUCATA', bruto: 0, tara: 0, descontos: 0, liquido: 0 };
const initialWeighingSet: WeighingSet = { id: uuidv4(), name: "CAÇAMBA 1", items: [], descontoCacamba: 0 };

const ScaleCalculator = forwardRef((props, ref) => {
  const { weight: liveWeight, status, connectionType, config, setConfig, saveConfig } = useScale();
  const [headerData, setHeaderData] = useState({ client: "", plate: "", driver: "" });
  const [weighingSets, setWeighingSets] = useState<WeighingSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<OperationType>('loading');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  useEffect(() => {
    const savedData = localStorage.getItem("scaleData");
    if (savedData) {
      try {
        const { weighingSets: savedSets, headerData: savedHeader, operationType: savedOpType } = JSON.parse(savedData);
        setWeighingSets(savedSets || []);
        setHeaderData(savedHeader || { client: "", plate: "", driver: "" });
        setOperationType(savedOpType || 'loading');
        if (savedSets && savedSets.length > 0) {
            setActiveSetId(savedSets[0]?.id);
        } else {
            const newSet = { ...initialWeighingSet, id: uuidv4(), items: [ { ...initialItem, id: uuidv4() }] };
            setWeighingSets([newSet]);
            setActiveSetId(newSet.id);
        }
      } catch (e) {
        const newSet = { ...initialWeighingSet, id: uuidv4(), items: [ { ...initialItem, id: uuidv4() }] };
        setWeighingSets([newSet]);
        setActiveSetId(newSet.id);
      }
    } else if (weighingSets.length === 0) {
      const newSet = { ...initialWeighingSet, id: uuidv4(), items: [ { ...initialItem, id: uuidv4() }] };
      setWeighingSets([newSet]);
      setActiveSetId(newSet.id);
    }
  }, []);

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
      if (prevSets.length === 0) {
        const newSet = {
          ...initialWeighingSet,
          id: setId || uuidv4(),
          items: [{ ...initialItem, id: itemId || uuidv4(), [field]: numValue }],
        };
        const newItem = newSet.items[0];
        if (field === 'bruto') {
            newItem.liquido = numValue - newItem.tara - newItem.descontos;
        } else if (field === 'tara' || field === 'descontos') {
            newItem.liquido = newItem.bruto - numValue - (field === 'tara' ? newItem.descontos : newItem.tara);
        }
        setActiveSetId(newSet.id);
        return [newSet];
      }

      return prevSets.map(set => {
        if (set.id === setId) {
          if (set.items.length === 0) {
             const newItem = { ...initialItem, id: itemId, [field]: numValue };
             newItem.liquido = newItem.bruto - newItem.tara - newItem.descontos;
             return { ...set, items: [newItem] };
          }
          
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
          if (!lastItem) return set;
          
          let newItem: WeighingItem;

          if (operationType === 'loading') { // Venda - Carregamento
             newItem = {
              id: uuidv4(),
              material: "SUCATA",
              bruto: 0,
              tara: lastItem.bruto, // Tara do novo é o bruto do anterior
              descontos: 0,
              liquido: 0,
            };
          } else { // Compra - Descarregamento
            newItem = {
              id: uuidv4(),
              material: "SUCATA",
              bruto: lastItem.tara, // Bruto do novo é a tara do anterior
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
    const firstSet = weighingSets[0];
    const firstItemOfFirstSet = firstSet?.items[0];

    if (!firstItemOfFirstSet) {
        toast({
            variant: "destructive",
            title: "Primeira caçamba vazia",
            description: "Adicione e pese pelo menos um material na Caçamba 1 antes de adicionar outra.",
        });
        return;
    }

    const truckTara = firstItemOfFirstSet.tara;
    const newSetNumber = weighingSets.length + 1;

    const newSet: WeighingSet = {
        id: uuidv4(),
        name: `CAÇAMBA ${newSetNumber}`,
        items: [{
            id: uuidv4(),
            material: "SUCATA",
            bruto: 0,
            tara: truckTara,
            descontos: 0,
            liquido: 0 - truckTara,
        }],
        descontoCacamba: 0
    };

    setWeighingSets(prev => [...prev, newSet]);
    setActiveSetId(newSet.id);
  };

  const removeSet = (setId: string) => {
    setWeighingSets(prev => {
        const newSets = prev.filter(s => s.id !== setId);
        const renumberedSets = newSets.map((s, index) => ({
            ...s,
            name: `CAÇAMBA ${index + 1}`
        }));
        setWeighingSets(renumberedSets);
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
                // Não permite remover o último item
                if (set.items.length <= 1) {
                    toast({
                        variant: "destructive",
                        title: "Ação não permitida",
                        description: "Não é possível remover o único material da caçamba.",
                    });
                    return set;
                }
                const newItems = set.items.filter(item => item.id !== itemId);
                return { ...set, items: newItems };
            }
            return set;
        })
    );
  };

  const handleClear = () => {
    const newWeighingSet: WeighingSet = { id: uuidv4(), name: "CAÇAMBA 1", items: [{ ...initialItem, id: uuidv4() }], descontoCacamba: 0 };
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

  const handleFetchLiveWeight = (setId: string, itemId: string, field: 'bruto' | 'tara') => {
    if (status !== 'connected') {
      toast({
        variant: "destructive",
        title: "Balança não conectada",
        description: "Verifique a conexão com a balança.",
      });
      return;
    }
    handleInputChange(setId, itemId, field, liveWeight.toString());
    toast({ title: "Peso Capturado!", description: `Peso de ${liveWeight}kg aplicado ao campo ${field}.` });
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
  
  const grandTotalLiquido = weighingSets.reduce((total, set) => {
    const setItemsTotal = set.items.reduce((acc, item) => acc + item.liquido, 0);
    return total + (setItemsTotal - set.descontoCacamba);
  }, 0);

  const firstSet = weighingSets.length > 0 ? weighingSets[0] : { ...initialWeighingSet, id: activeSetId || uuidv4() };
  const firstItem = firstSet.items.length > 0 ? firstSet.items[0] : { ...initialItem, id: uuidv4() };
  const initialWeightField = operationType === 'loading' ? 'tara' : 'bruto';
  const initialWeightValue = firstSet.items.length > 0 ? firstSet.items[0][initialWeightField] : 0;

  return (
    <div className="p-px bg-background max-w-7xl mx-auto" id="scale-calculator-printable-area">
      <NetworkSettingsDialog 
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        config={config}
        onConfigChange={setConfig}
        onSave={saveConfig}
      />
      <div className="mb-4 print:hidden text-center">
        <h2 className="text-xl font-bold">Pesagem Avulsa</h2>
      </div>
      <div className="flex justify-end items-center gap-4 mb-4 print:hidden">
        <div className="flex-grow">
          <LiveScaleInfo 
              status={status}
              weight={liveWeight}
          />
        </div>
        <div className="flex items-center gap-2">
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
             
              <TooltipProvider>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setIsSettingsOpen(true)}>
                      <Network className="h-5 w-5"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Configurações de Rede</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
        </div>
      </div>

      <Card className="mb-px print:border-none print:shadow-none print:p-0">
        <CardContent className="p-px print:p-0">
          <div className="w-full space-y-0.5">
            <div className="flex justify-between items-end">
                <Label htmlFor="cliente" className="font-semibold text-sm md:text-base">Cliente</Label>
                <div className="flex text-xs text-muted-foreground -mr-1">
                    <span className="w-28 text-center">Tara</span>
                    <span className="w-28 text-center ml-1.5">Bruto</span>
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
                    <Label className="text-xs sm:text-sm text-muted-foreground text-center block w-full">{operationType === 'loading' ? 'Tara' : 'Bruto'}</Label>
                    <div className="flex items-center">
                      <Input 
                          type="text" 
                          inputMode="decimal" 
                          placeholder="0" 
                          value={formatNumber(initialWeightValue)} 
                          onChange={(e) => handleInputChange(firstSet.id, firstItem.id, initialWeightField, e.target.value)} 
                          className="text-right h-8 print:hidden w-full rounded-r-none"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => handleFetchLiveWeight(firstSet.id, firstItem.id, initialWeightField)} disabled={status !== 'connected'}>
                                <Weight className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Buscar Peso da Balança</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="hidden print:block text-right print:text-black">{formatNumber(initialWeightValue)}</span>
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
                        className="text-xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 h-auto w-48"
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
                                  <div className="flex items-center">
                                    <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.bruto)} onChange={(e) => handleInputChange(set.id, item.id, 'bruto', e.target.value)} className="text-right h-8 print:hidden w-full rounded-r-none" />
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => handleFetchLiveWeight(set.id, item.id, 'bruto')} disabled={status !== 'connected'}>
                                        <Weight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                   <span className="hidden print:block text-right print:text-black">{formatNumber(item.bruto)}</span>
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Tara (kg)</Label>
                                  <div className="flex items-center">
                                      <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.tara)} onChange={(e) => handleInputChange(set.id, item.id, 'tara', e.target.value)} className="text-right h-8 print:hidden w-full rounded-r-none" />
                                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => handleFetchLiveWeight(set.id, item.id, 'tara')} disabled={status !== 'connected'}>
                                        <Weight className="h-4 w-4" />
                                      </Button>
                                    </div>
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
                  {set.items.map((item) => {
                      return (
                    <TableRow key={item.id} className="print:text-black">
                      <TableCell className="font-medium p-0 sm:p-px">
                           <Input
                              value={item.material}
                              onChange={(e) => handleMaterialChange(set.id, item.id, e.target.value)}
                              className="w-full justify-between h-8"
                            />
                      </TableCell>
                      <TableCell className="p-0 sm:p-px">
                            <div className="flex items-center justify-end">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={formatNumber(item.bruto)}
                                    onChange={(e) => handleInputChange(set.id, item.id, 'bruto', e.target.value)}
                                    className="text-right h-8 print:hidden w-full rounded-r-none"
                                  />
                                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => handleFetchLiveWeight(set.id, item.id, 'bruto')} disabled={status !== 'connected'}>
                                      <Weight className="h-4 w-4" />
                                  </Button>
                            </div>
                            <span className="hidden print:block text-right print:text-black">{formatNumber(item.bruto)}</span>
                      </TableCell>
                      <TableCell className="p-0 sm:p-px">
                            <div className="flex items-center justify-end">
                                  <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={formatNumber(item.tara)}
                                  onChange={(e) => handleInputChange(set.id, item.id, 'tara', e.target.value)}
                                  className="text-right h-8 print:hidden w-full rounded-r-none"
                                  />
                                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => handleFetchLiveWeight(set.id, item.id, 'tara')} disabled={status !== 'connected'}>
                                    <Weight className="h-4 w-4" />
                                  </Button>
                            </div>
                            <span className="hidden print:block text-right print:text-black">{formatNumber(item.tara)}</span>
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
                         <p className="text-xl font-bold text-primary print:text-black">{formatNumber(totalLiquidoSet)} kg</p>
                     </div>
                 </div>
            </CardContent>
          </Card>
        );
      })}

      
        <div className="flex justify-center my-px print:hidden">
          <Button variant="secondary" onClick={addNewSet} size="sm" className="h-8 px-2"><Tractor className="mr-2 h-4 w-4" /> + Adicionar Caçamba</Button>
        </div>
      

      <Card className="mt-px bg-primary/10 border-primary/20 print:border print:border-accent-price print:shadow-none print:p-0.5">
         <CardContent className="p-px flex justify-end items-center">
             <div className="text-right">
                <p className="text-lg font-semibold text-primary print:text-2xl print:mb-0.5">Peso Líquido Total</p>
                <p className="text-4xl font-bold text-primary print:text-black">{new Intl.NumberFormat('pt-BR').format(grandTotalLiquido)} kg</p>
            </div>
         </CardContent>
      </Card>
      <div className="flex items-center justify-center pt-1 print:hidden gap-16">
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
            <TooltipContent><p>Imprimir / Salvar PDF</p></TooltipContent>          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});
ScaleCalculator.displayName = 'ScaleCalculator';

export default ScaleCalculator;

    

    


