
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "./ui/button";
import { PlusCircle, Trash2, Printer, Save, Download } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";

interface MaterialBox {
  id: string;
  name: string;
  tare: string;
  discount: string;
  container: string;
  net: number;
}

interface WeighingSet {
  id: string;
  driverName: string;
  plate: string;
  gross: string;
  boxes: MaterialBox[];
  totalNet: number;
}

const LOCAL_STORAGE_KEY = "scaleCalculatorState";

export function ScaleCalculator() {
  const { toast } = useToast();
  const [customerName, setCustomerName] = React.useState("");
  const [weighingSets, setWeighingSets] = React.useState<WeighingSet[]>([]);

  React.useEffect(() => {
    // Only run on client
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const { customerName, weighingSets } = JSON.parse(savedState);
        setCustomerName(customerName);
        setWeighingSets(weighingSets);
      } else {
        // If no saved state, initialize with one default entry
        setWeighingSets([
          {
            id: uuidv4(),
            driverName: "",
            plate: "",
            gross: "",
            boxes: [{ id: uuidv4(), name: "Material 1", tare: "", discount: "", container: "", net: 0 }],
            totalNet: 0,
          },
        ]);
      }
    } catch (error) {
       console.error("Failed to auto-load state from localStorage", error);
       // Fallback to default if local storage fails
       setWeighingSets([
        {
          id: uuidv4(),
          driverName: "",
          plate: "",
          gross: "",
          boxes: [{ id: uuidv4(), name: "Material 1", tare: "", discount: "", container: "", net: 0 }],
          totalNet: 0,
        },
      ]);
    }
  }, []);

  const saveStateToLocalStorage = () => {
    try {
      const stateToSave = {
        customerName,
        weighingSets,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
      toast({
        title: "Progresso Salvo!",
        description: "Sua pesagem foi salva localmente no seu dispositivo.",
      });
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Não foi possível salvar os dados. O armazenamento local pode estar cheio ou indisponível.",
      });
    }
  };

  const loadStateFromLocalStorage = () => {
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const { customerName, weighingSets } = JSON.parse(savedState);
        setCustomerName(customerName);
        setWeighingSets(weighingSets);
         toast({
          title: "Dados Carregados",
          description: "A última pesagem salva foi carregada.",
        });
      } else {
        toast({
            variant: "default",
            title: "Nenhum dado salvo",
            description: "Não há nenhuma pesagem salva para carregar.",
        });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
       toast({
        variant: "destructive",
        title: "Erro ao Carregar",
        description: "Não foi possível carregar os dados salvos.",
      });
    }
  };


  const handleSetTextChange = (
    value: string,
    setId: string,
    field: keyof Omit<WeighingSet, "boxes" | "totalNet" | "id" | "gross">
  ) => {
    setWeighingSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;
        return { ...set, [field]: value };
      })
    );
  };
  
  const handleInputChange = (
    value: string,
    setId: string,
    field: keyof Omit<WeighingSet, "boxes" | "totalNet" | "id" | "driverName" | "plate">,
  ) => {
    const sanitizedValue = value.replace(/[^0-9,]/g, "").replace(",", ".");
    if (/^\d*\.?\d*$/.test(sanitizedValue)) {
      const newValue = sanitizedValue.replace(".", ",");
      setWeighingSets((prevSets) =>
        prevSets.map((set) => {
          if (set.id !== setId) return set;
          return { ...set, [field]: newValue };
        })
      );
    }
  };
  
  const handleBoxInputChange = (value: string, setId: string, boxId: string, field: keyof Omit<MaterialBox, 'id' | 'net'>) => {
    if (field === 'name') {
      setWeighingSets(prevSets => prevSets.map(set => {
        if (set.id !== setId) return set;
        const updatedBoxes = set.boxes.map(box => 
          box.id === boxId ? { ...box, name: value } : box
        );
        return { ...set, boxes: updatedBoxes };
      }));
      return;
    }
    
    const sanitizedValue = value.replace(/[^0-9,]/g, "").replace(",", ".");
    if (/^\d*\.?\d*$/.test(sanitizedValue)) {
      const newValue = sanitizedValue.replace(".", ",");
      setWeighingSets(prevSets => prevSets.map(set => {
        if (set.id !== setId) return set;
        const updatedBoxes = set.boxes.map(box => 
          box.id === boxId ? { ...box, [field]: newValue } : box
        );
        return { ...set, boxes: updatedBoxes };
      }));
    }
  };


  React.useEffect(() => {
    setWeighingSets((prevSets) =>
      prevSets.map((set) => {
        let currentGross = parseFloat(set.gross.replace(",", ".")) || 0;
        
        const updatedBoxes = set.boxes.map((box, index) => {
          const tare = parseFloat(box.tare.replace(",", ".")) || 0;
          const discount = parseFloat(box.discount.replace(",", ".")) || 0;
          const container = parseFloat(box.container.replace(",", ".")) || 0;

          const grossForThisBox = index === 0 ? currentGross : parseFloat(set.boxes[index - 1].tare.replace(",", ".")) || 0;
          
          let net = 0;
          if (grossForThisBox > 0 && tare > 0 && grossForThisBox >= tare) {
              net = grossForThisBox - tare - discount - container;
          }

          return { ...box, net };
        });

        const totalNet = updatedBoxes.reduce((acc, box) => acc + (box.net > 0 ? box.net : 0), 0);
        return { ...set, boxes: updatedBoxes, totalNet };
      })
    );
  }, [JSON.stringify(weighingSets.map(s => ({ gross: s.gross, boxes: s.boxes.map(b => ({ tare: b.tare, discount: b.discount, container: b.container }))})))]);


  const addMaterialBox = (setId: string) => {
    setWeighingSets((prevSets) =>
      prevSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              boxes: [
                ...set.boxes,
                { id: uuidv4(), name: `Material ${set.boxes.length + 1}`, tare: "", discount: "", container: "", net: 0 },
              ],
            }
          : set
      )
    );
  };

  const removeMaterialBox = (setId: string, boxId: string) => {
    setWeighingSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;
        const updatedBoxes = set.boxes.filter((box) => box.id !== boxId);
        if (updatedBoxes.length === 0) {
          return { ...set, boxes: [{ id: uuidv4(), name: "Material 1", tare: "", discount: "", container: "", net: 0 }] };
        }
        return { ...set, boxes: updatedBoxes };
      })
    );
  };

  const addWeighingSet = () => {
    setWeighingSets((prevSets) => [
      ...prevSets,
      {
        id: uuidv4(),
        driverName: "",
        plate: "",
        gross: "",
        boxes: [{ id: uuidv4(), name: "Material 1", tare: "", discount: "", container: "", net: 0 }],
        totalNet: 0,
      },
    ]);
  };

  const removeWeighingSet = (setId: string) => {
    setWeighingSets(prevSets => {
        const updatedSets = prevSets.filter(set => set.id !== setId);
        if (updatedSets.length === 0) {
            return [{
              id: uuidv4(),
              driverName: "",
              plate: "",
              gross: "",
              boxes: [{ id: uuidv4(), name: "Material 1", tare: "", discount: "", container: "", net: 0 }],
              totalNet: 0,
            }];
        }
        return updatedSets;
    });
  };

  const grandTotalNet = weighingSets.reduce((acc, set) => acc + set.totalNet, 0);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (weighingSets.length === 0) {
    return null; // Or a loading indicator
  }

  return (
    <div id="scale-calculator-printable-area" className="space-y-4">
        <div className="flex items-center justify-between mb-4">
            <Button variant="outline">Manual</Button>
            <h1 className="text-xl font-bold text-center">Pesagem Avulsa</h1>
            <Button variant="outline">Eletrônica</Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-name">Nome do Cliente</Label>
          <Input
            id="customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Digite o nome do cliente"
          />
        </div>

        {weighingSets.map((set, setIndex) => (
          <Card key={set.id} className="bg-card/50 pt-2 print:shadow-none print:border-border">
            <CardHeader className="flex-row items-center justify-between pt-2 pb-2">
                <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">Pesagem {setIndex + 1}</CardTitle>
                </div>
              {weighingSets.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeWeighingSet(set.id)} className="print:hidden h-8 w-8">
                  <Trash2 className="text-destructive"/>
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-0">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <Label htmlFor={`driver-name-${set.id}`} className="text-xs text-muted-foreground">Motorista</Label>
                        <Input
                            id={`driver-name-${set.id}`}
                            value={set.driverName}
                            onChange={(e) => handleSetTextChange(e.target.value, set.id, "driverName")}
                            placeholder="Nome"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`plate-${set.id}`} className="text-xs text-muted-foreground">Placa</Label>
                        <Input
                            id={`plate-${set.id}`}
                            value={set.plate}
                            onChange={(e) => handleSetTextChange(e.target.value, set.id, "plate")}
                            placeholder="Placa"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`gross-${set.id}`} className="text-xs text-muted-foreground">Bruto (kg)</Label>
                    <Input
                        id={`gross-${set.id}`}
                        type="text"
                        inputMode="decimal"
                        value={set.gross}
                        onChange={(e) => handleInputChange(e.target.value, set.id, "gross")}
                        placeholder="Peso inicial"
                    />
                </div>

              {set.boxes.map((box) => (
                <div key={box.id} className="space-y-3 rounded-lg border bg-background p-3 relative print:border-border">
                  <div className="flex items-center justify-between">
                    <Input 
                      value={box.name}
                      onChange={(e) => handleBoxInputChange(e.target.value, set.id, box.id, 'name')}
                      className="text-base font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent w-full"
                    />
                    {set.boxes.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 print:hidden" onClick={() => removeMaterialBox(set.id, box.id)}>
                          <Trash2 className="text-destructive h-4 w-4"/>
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                      <div className="space-y-2 w-[calc(50%-0.25rem)]">
                        <Label htmlFor={`tare-${box.id}`} className="text-xs text-muted-foreground">Tara (kg)</Label>
                        <Input
                          id={`tare-${box.id}`}
                          type="text"
                          inputMode="decimal"
                          value={box.tare}
                          onChange={(e) => handleBoxInputChange(e.target.value, set.id, box.id, 'tare')}
                          placeholder="Peso"
                        />
                      </div>
                      <div className="space-y-2 w-[calc(50%-0.25rem)]">
                        <Label htmlFor={`discount-${box.id}`} className="text-xs text-muted-foreground">Desconto (kg)</Label>
                        <Input
                          id={`discount-${box.id}`}
                          type="text"
                          inputMode="decimal"
                          value={box.discount}
                          onChange={(e) => handleBoxInputChange(e.target.value, set.id, box.id, 'discount')}
                          placeholder="Lixo, outros"
                        />
                      </div>
                      <div className="space-y-2 w-[calc(50%-0.25rem)]">
                        <Label htmlFor={`container-${box.id}`} className="text-xs text-muted-foreground">Caçamba (kg)</Label>
                        <Input
                          id={`container-${box.id}`}
                          type="text"
                          inputMode="decimal"
                          value={box.container}
                          onChange={(e) => handleBoxInputChange(e.target.value, set.id, box.id, 'container')}
                          placeholder="Peso"
                        />
                      </div>
                      <div className="space-y-2 w-[calc(50%-0.25rem)]">
                          <Label className="text-accent-price font-semibold text-xs">Peso Líquido</Label>
                          <div className="w-full rounded-md border border-accent-price/50 bg-accent-price/10 px-3 py-2 text-sm font-bold text-accent-price h-10 flex items-center print:bg-transparent print:border-accent-price">
                              {formatNumber(box.net)} kg
                          </div>
                      </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addMaterialBox(set.id)} className="gap-2 print:hidden h-9">
                <PlusCircle className="h-4 w-4"/>
                Adicionar Material
              </Button>
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-col gap-2 print:hidden">
            <Button variant="secondary" onClick={addWeighingSet} className="gap-2 h-9">
                <PlusCircle className="h-4 w-4" />
                Adicionar Pesagem (Bitrem)
            </Button>
        </div>

        <Separator />

        <div className="flex justify-end items-center gap-4 pt-2">
            <h3 className="text-lg font-semibold">Total Geral Líquido:</h3>
            <div className="text-2xl font-bold text-primary min-w-[150px] text-right">
                {formatNumber(grandTotalNet)} kg
            </div>
        </div>

        <div className="flex justify-end flex-wrap pt-2 gap-2 print:hidden">
            <Button onClick={saveStateToLocalStorage} className="gap-2" variant="outline">
                <Save />
                Salvar Progresso
            </Button>
             <Button onClick={loadStateFromLocalStorage} className="gap-2" variant="outline">
                <Download />
                Carregar Última Pesagem
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
                <Printer />
                Imprimir / Salvar PDF
            </Button>
        </div>
    </div>
  );
}
