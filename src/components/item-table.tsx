"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardTitle } from "./ui/card";
import type { Category, SteelItem } from "@/lib/data";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { CutPriceCalculator } from "./cut-price-calculator";

interface ItemTableProps {
  category: Category;
  sellingPrice: number;
  showTableHeader?: boolean;
}

export function ItemTable({ category, sellingPrice, showTableHeader = true }: ItemTableProps) {
  const [items, setItems] = React.useState<SteelItem[]>(category.items);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);

  const [newDescription, setNewDescription] = React.useState("");
  const [newWeight, setNewWeight] = React.useState<number | "">("");

  React.useEffect(() => {
    setItems(category.items);
    setSelectedItemId(null); 
  }, [category]);

  const handleAddItem = () => {
    if (newDescription && newWeight) {
      const newItem: SteelItem = {
        id: `custom-${Date.now()}`,
        description: newDescription,
        weight: Number(newWeight),
      };
      setItems([...items, newItem]);
      setNewDescription("");
      setNewWeight("");
      setIsDialogOpen(false);
    }
  };
  
  const handleRowClick = (itemId: string) => {
    if (category.unit === 'm') {
      if (selectedItemId === itemId) {
        setSelectedItemId(null); // Deselect if clicking the same item
      } else {
        setSelectedItemId(itemId);
      }
    }
  };

  const filteredItems = items;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number, digits: number = 3) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  };
  
  const unitLabel = category.unit === "m" ? "m" : category.unit === 'm²' ? "m²" : "un";
  const weightUnitLabel = `kg/${unitLabel}`;
  const priceUnitLabel = `R$/${unitLabel}`;

  return (
    <>
    <div className="flex items-center justify-between mb-4">
        <div/>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Adicionar Item
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Item em {category.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="weight" className="text-right">
                  Peso ({weightUnitLabel})
                </Label>
                <Input
                  id="weight"
                  type="number"
                  value={newWeight}
                  onChange={(e) =>
                    setNewWeight(
                      e.target.value === "" ? "" : e.target.valueAsNumber
                    )
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleAddItem}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          {showTableHeader && (
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/10">
                <TableHead className="flex-1">Descrição</TableHead>
                <TableHead className="w-1/3 text-center">
                  Peso ({weightUnitLabel})
                </TableHead>
                <TableHead className="w-1/3 text-right font-semibold text-primary">
                  Preço ({priceUnitLabel})
                </TableHead>
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {filteredItems.map((item) => {
                const itemPrice = category.unit === 'm' ? Math.ceil(item.weight * sellingPrice) : item.weight * sellingPrice;
                const isSelected = selectedItemId === item.id;
              return (
                  <React.Fragment key={item.id}>
                      <TableRow 
                          onClick={() => handleRowClick(item.id)}
                          className={cn(
                              'even:bg-primary/5 odd:bg-transparent',
                              'flex items-center',
                              category.unit === 'm' && 'cursor-pointer',
                              isSelected && 'bg-primary/20 hover:bg-primary/20',
                              category.unit !== 'm' && 'hover:bg-primary/10',
                          )}
                          >
                          <TableCell className="flex-1 px-8">{item.description}</TableCell>
                          <TableCell className="w-1/3 text-center px-8">
                              {formatNumber(item.weight, 3)}
                          </TableCell>
                          <TableCell className="w-1/3 text-right font-medium text-primary px-8">
                              <div className="flex items-center justify-end gap-2">
                                <span>{formatCurrency(itemPrice)}</span>
                              </div>
                              {category.unit === 'm' && (
                                  <div className="text-xs text-muted-foreground font-normal">
                                      {formatCurrency(itemPrice * 6)} / barra
                                  </div>
                              )}
                          </TableCell>
                      </TableRow>
                      {isSelected && category.unit === 'm' && (
                            <TableRow>
                              <TableCell colSpan={3} className="p-0">
                                  <div className="p-4 bg-primary/5">
                                  <CutPriceCalculator
                                      selectedItem={item}
                                      sellingPrice={sellingPrice}
                                      onClose={() => setSelectedItemId(null)}
                                  />
                                  </div>
                              </TableCell>
                          </TableRow>
                      )}
                  </React.Fragment>
            )})}
          </TableBody>
        </Table>
      </div>
      </>
  );
}
