
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "./ui/table";
import { PlusCircle, Tractor, ArrowDownToLine, ArrowUpFromLine, Trash2, Save, Printer, Weight, Loader2, PenSquare, Signal } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { doc } from "firebase/firestore";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";

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

type ScaleData = {
  grossWeight: number;
  tareWeight: number;
  timestamp: Date;
}

type OperationType = 'loading' | 'unloading';
type WeighingMode = 'manual' | 'electronic';

const initialItem: WeighingItem = { id: '', material: '', bruto: 0, tara: 0, descontos: 0, liquido: 0 };
const initialWeighingSet: WeighingSet = { id: uuidv4(), name: "CAÇAMBA 1", items: [], descontoCacamba: 0 };

const ScaleCalculator = forwardRef((props, ref) => {
  const [headerData, setHeaderData] = useState({
    client: "",
    plate: "",
    driver: "",
  });
  const [weighingSets, setWeighingSets] = useState<WeighingSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<OperationType>('loading');
  const [weighingMode, setWeighingMode] = useState<WeighingMode>('manual');

  const firestore = useFirestore();
  const scaleDataRef = useMemoFirebase(
    () => firestore ? doc(firestore, "scale_data", "live") : null,
    [firestore]
  );
  const { data: liveScaleData, isLoading: isScaleDataLoading } = useDoc<ScaleData>(scaleDataRef);

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
            const newSet = { ...initialWeighingSet, id: uuidv4(), items: [ { ...initialItem, id: uuidv4(), material: "SUCATA INOX" }] };
            setWeighingSets([newSet]);
            setActiveSetId(newSet.id);
        }
      } catch (e) {
        const newSet = { ...initialWeighingSet, id: uuidv4(), items: [ { ...initialItem, id: uuidv4(), material: "SUCATA INOX" }] };
        setWeighingSets([newSet]);
        setActiveSetId(newSet.id);
      }
    } else if (weighingSets.length === 0) {
      const newSet = { ...initialWeighingSet, id: uuidv4(), items: [ { ...initialItem, id: uuidv4(), material: "SUCATA INOX" }] };
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
    setWeighingSets(prevSets =>
      prevSets.map(set => {
        if (set.id === setId) {
          const lastItem = set.items[set.items.length - 1];
          if (!lastItem) return set;
          
          let newItem: WeighingItem;

          if (operationType === 'loading') { // Venda - Carregamento
            newItem = {
              id: uuidv4(),
              material: "SUCATA INOX",
              bruto: 0,
              tara: lastItem.bruto, // Tara do novo é o bruto do anterior
              descontos: 0,
              liquido: 0,
            };
          } else { // Compra - Descarregamento
            newItem = {
              id: uuidv4(),
              material: "SUCATA INOX",
              bruto: 0,
              tara: lastItem.bruto, // Bruto do novo é a tara do anterior
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
  
  const addBitrem = () => {
    if (weighingSets.length >= 2) return;

    const firstSet = weighingSets[0];
    const firstItemOfFirstSet = firstSet.items[0];

    if (!firstItemOfFirstSet) {
        toast({
            variant: "destructive",
            title: "Primeira caçamba vazia",
            description: "Adicione e pese pelo menos um material na Caçamba 1 antes de adicionar o bitrem.",
        });
        return;
    }

    const truckTara = firstItemOfFirstSet.tara;

    const newSet: WeighingSet = {
        id: uuidv4(),
        name: "BITREM / CAÇAMBA 2",
        items: [{
            id: uuidv4(),
            material: "SUCATA INOX",
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

  const handleClear = () => {
    const newWeighingSet: WeighingSet = { id: uuidv4(), name: "CAÇAMBA 1", items: [{ ...initialItem, id: uuidv4(), material: "SUCATA INOX" }], descontoCacamba: 0 };
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
    if (isScaleDataLoading) {
      toast({ title: "Aguardando balança...", description: "Buscando dados da balança." });
      return;
    }
    if (!liveScaleData) {
      toast({ variant: "destructive", title: "Balança Offline", description: "Não foi possível obter o peso da balança. Verifique a conexão." });
      return;
    }

    const weight = liveScaleData.grossWeight || 0;
    handleInputChange(setId, itemId, field, weight.toString());
    toast({ title: "Peso Capturado!", description: `Peso de ${weight}kg aplicado ao campo ${field}.` });
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

  const firstSet = weighingSets.length > 0 ? weighingSets[0] : null;
  const firstItem = firstSet && firstSet.items.length > 0 ? firstSet.items[0] : null;
  const initialWeightField = operationType === 'loading' ? 'tara' : 'bruto';
  const initialWeightValue = firstItem ? firstItem[initialWeightField] : 0;

  return (
    <div className="p-px bg-background max-w-7xl mx-auto" id="scale-calculator-printable-area">
      <div className="flex justify-between items-center mb-4 px-2 print:hidden">
        <TooltipProvider>
          <ToggleGroup 
            type="single" 
            variant="outline"
            value={weighingMode} 
            onValueChange={(value) => {
              if (value) setWeighingMode(value as WeighingMode);
            }}
            className="p-1"
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
                  <Signal className="h-5 w-5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent><p>Pesagem Eletrônica</p></TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </TooltipProvider>
        <h2 className="text-xl font-bold">Pesagem Avulsa</h2>
        <div></div>
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
                        <Button variant="outline" className="h-8 w-full justify-between" onClick={() => firstSet && firstItem && handleFetchLiveWeight(firstSet.id, firstItem.id, initialWeightField)}>
                            <span>{formatNumber(initialWeightValue) || "Buscar"}</span>
                            {isScaleDataLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Weight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <Input 
                            type="text" 
                            inputMode="decimal" 
                            placeholder="0" 
                            value={formatNumber(initialWeightValue)} 
                            onChange={(e) => firstSet && firstItem && handleInputChange(firstSet.id, firstItem.id, initialWeightField, e.target.value)} 
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
         const subtotalLiquido = set.items.reduce((acc, item) => acc + item.liquido, 0);
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
            <CardContent className="p-0 overflow-x-auto">
              {/* Mobile Layout */}
              <div className="sm:hidden">
                  {set.items.map((item) => {
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
                                     <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'bruto')}>
                                          <span>{formatNumber(item.bruto) || "Buscar"}</span>
                                          {isScaleDataLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Weight className="h-4 w-4" />}
                                     </Button>
                                  ) : (
                                    <Input type="text" inputMode="decimal" placeholder="0" value={formatNumber(item.bruto)} onChange={(e) => handleInputChange(set.id, item.id, 'bruto', e.target.value)} className="text-right h-8 print:hidden w-full" />
                                  )}
                                   <span className="hidden print:block text-right print:text-black">{formatNumber(item.bruto)}</span>
                              </div>
                               <div className="space-y-px">
                                  <Label className="text-xs text-muted-foreground">Tara (kg)</Label>
                                    {weighingMode === 'electronic' ? (
                                         <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'tara')}>
                                              <span>{formatNumber(item.tara) || "Buscar"}</span>
                                              {isScaleDataLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Weight className="h-4 w-4" />}
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
                    <TableHead className="w-[30%]">Material</TableHead>
                    <TableHead className="text-right w-[17.5%]">Bruto (kg)</TableHead>
                    <TableHead className="text-right w-[17.5%]">Tara (kg)</TableHead>
                    <TableHead className="text-right w-[17.5%]">A/L (kg)</TableHead>
                    <TableHead className="text-right font-semibold w-[17.5%]">Líquido (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {set.items.map((item) => {
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
                                    <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'bruto')}>
                                        <span>{formatNumber(item.bruto) || "Buscar Peso"}</span>
                                        {isScaleDataLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Weight className="h-4 w-4" />}
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
                                    <Button variant="outline" className="h-8 w-full justify-between" onClick={() => handleFetchLiveWeight(set.id, item.id, 'tara')}>
                                        <span>{formatNumber(item.tara) || "Buscar Peso"}</span>
                                        {isScaleDataLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Weight className="h-4 w-4" />}
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
                                <span className="print:text-black">{formatNumber(item.liquido)}</span>
                            </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </CardContent>
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
                         <p className="text-lg font-bold print:text-black">{formatNumber(subtotalLiquido)} kg</p>
                     </div>
                      <div className="text-right flex-shrink-0">
                         <p className="text-sm text-muted-foreground">{setIndex === 0 ? "Caçamba 1" : "Bitrem / Caçamba 2"}</p>
                         <p className="text-xl font-bold text-primary print:text-black">{formatNumber(totalLiquidoSet)} kg</p>
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
      <div className="flex items-center gap-1 justify-center pt-1 print:hidden">
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
