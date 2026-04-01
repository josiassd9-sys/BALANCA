'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMaterialCatalog } from '@/hooks/use-material-catalog';

const CATEGORY_ORDER = [
  'INOX E LIGAS',
  'CAVACOS',
  'FERROSOS',
  'NAO FERROSOS',
  'ELETRICOS E ELETRONICOS',
  'BATERIAS E AUTOMOTIVO',
  'RECICLAVEIS URBANOS',
  'RESIDUOS E OUTROS',
] as const;

function getMaterialCategory(material: string): string {
  if (
    material.includes('INOX') ||
    material.includes('DUPLEX') ||
    material.includes('NITRONIC') ||
    material.includes('ALLOY') ||
    material.includes('NI-RESIST')
  ) {
    return 'INOX E LIGAS';
  }

  if (material.includes('CAVACO')) {
    return 'CAVACOS';
  }

  if (
    material.includes('FERRO') ||
    material.includes('ACO') ||
    material.includes('TRILHO') ||
    material.includes('VERGALHAO') ||
    material.includes('MALHA')
  ) {
    return 'FERROSOS';
  }

  if (
    material.includes('BATERIA') ||
    material.includes('MOTOR') ||
    material.includes('ALTERNADOR') ||
    material.includes('CATALISADOR') ||
    material.includes('CHICOTE') ||
    material.includes('COMPRESSOR') ||
    material.includes('RADIADOR')
  ) {
    return 'BATERIAS E AUTOMOTIVO';
  }

  if (
    material.includes('ALUMINIO') ||
    material.includes('COBRE') ||
    material.includes('LATAO') ||
    material.includes('BRONZE') ||
    material.includes('CHUMBO') ||
    material.includes('ZINCO') ||
    material.includes('NIQUEL') ||
    material.includes('ESTANHO') ||
    material.includes('MAGNESIO') ||
    material.includes('ZAMAK')
  ) {
    return 'NAO FERROSOS';
  }

  if (
    material.includes('ELETRONICA') ||
    material.includes('PLACA') ||
    material.includes('COMPUTADOR') ||
    material.includes('CELULAR') ||
    material.includes('CABO') ||
    material.includes('FIACAO') ||
    material.includes('FIO') ||
    material.includes('ELETRODOMESTICO') ||
    material.includes('LINHA BRANCA') ||
    material.includes('GELADEIRA') ||
    material.includes('MAQUINA DE LAVAR') ||
    material.includes('AR CONDICIONADO') ||
    material.includes('LAMPADA FLUORESCENTE')
  ) {
    return 'ELETRICOS E ELETRONICOS';
  }

  if (
    material.includes('PLASTICO') ||
    material.includes('VIDRO') ||
    material.includes('PAPEL') ||
    material.includes('PAPELAO') ||
    material.includes('JORNAL') ||
    material.includes('PET') ||
    material.includes('LATINHA') ||
    material.includes('PNEU')
  ) {
    return 'RECICLAVEIS URBANOS';
  }

  return 'RESIDUOS E OUTROS';
}

export default function MateriaisPage() {
  const { toast } = useToast();
  const { materials, addMaterial, updateMaterial, removeMaterial } = useMaterialCatalog();

  const [newMaterial, setNewMaterial] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const filteredMaterials = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return materials;
    return materials.filter((material) => material.includes(term));
  }, [materials, searchTerm]);

  const groupedMaterials = useMemo(() => {
    const groups = new Map<string, string[]>();

    for (const material of filteredMaterials) {
      const category = getMaterialCategory(material);
      const current = groups.get(category) ?? [];
      current.push(material);
      groups.set(category, current);
    }

    const ordered = CATEGORY_ORDER.map((category) => ({
      category,
      items: groups.get(category) ?? [],
    })).filter((group) => group.items.length > 0);

    const additional = Array.from(groups.entries())
      .filter(([category]) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]))
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));

    return [...ordered, ...additional];
  }, [filteredMaterials]);

  const handleAddMaterial = () => {
    const normalized = newMaterial.trim().toUpperCase();
    if (!normalized) return;

    addMaterial(normalized);
    setNewMaterial('');
    toast({ title: 'Material adicionado', description: normalized });
  };

  const startEditing = (material: string) => {
    setEditingMaterial(material);
    setEditingValue(material);
  };

  const cancelEditing = () => {
    setEditingMaterial(null);
    setEditingValue('');
  };

  const saveEditing = () => {
    if (!editingMaterial) return;

    const normalized = editingValue.trim().toUpperCase();
    if (!normalized) {
      toast({
        variant: 'destructive',
        title: 'Nome invalido',
        description: 'Informe um nome de material valido.',
      });
      return;
    }

    updateMaterial(editingMaterial, normalized);
    toast({ title: 'Material atualizado', description: normalized });
    cancelEditing();
  };

  const deleteMaterial = (material: string) => {
    removeMaterial(material);
    toast({ title: 'Material removido', description: material });
  };

  return (
    <main className="container mx-auto max-w-4xl p-3 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalogo de Materiais</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre, edite e remova materiais para aparecer no autocomplete da pesagem.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Novo Material</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              value={newMaterial}
              onChange={(e) => setNewMaterial(e.target.value.toUpperCase())}
              placeholder="Ex: CAVACO DE INOX"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMaterial();
                }
              }}
            />
            <Button className="gap-2" onClick={handleAddMaterial}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Materiais ({materials.length})</CardTitle>
          <p className="text-xs text-muted-foreground">
            Materiais agrupados por categoria para facilitar edicao.
          </p>
          <div className="pt-2">
            <Label htmlFor="search-material" className="mb-1 block text-sm">
              Buscar
            </Label>
            <Input
              id="search-material"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite parte do nome para filtrar"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[55vh] pr-3">
            <div className="space-y-4">
              {groupedMaterials.map((group) => (
                <section key={group.category} className="space-y-2">
                  <div className="sticky top-0 z-10 rounded-md border bg-muted/80 px-2 py-1 text-xs font-semibold tracking-wide backdrop-blur">
                    {group.category} ({group.items.length})
                  </div>

                  {group.items.map((material) => (
                    <div key={material} className="flex items-center gap-2 rounded-md border p-2">
                      {editingMaterial === material ? (
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEditing();
                            }
                          }}
                        />
                      ) : (
                        <div className="flex-1 font-medium">{material}</div>
                      )}

                      {editingMaterial === material ? (
                        <>
                          <Button size="icon" variant="outline" onClick={saveEditing}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="outline" onClick={() => startEditing(material)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:text-destructive"
                            onClick={() => deleteMaterial(material)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </section>
              ))}

              {filteredMaterials.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum material encontrado para o filtro informado.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </main>
  );
}
