// =============================================================================
// MODELO DE IMPRESSÃO HTML — PRESERVADO PARA REFERÊNCIA FUTURA
// =============================================================================
//
// Este componente era usado nas rotas /balanca e /balanca/preview (deletadas).
// O layout HTML aqui é mais limpo e bonito do que o PDF gerado via jsPDF
// (src/services/weighing-pdf.ts), que usa autoTable com estilo genérico.
//
// FLUXO ANTIGO (desativado):
//   1. scale-calculator.tsx gravava os dados em localStorage("scaleData")
//   2. O usuário era redirecionado para /balanca (autoPrint=true) ou
//      /balanca/preview (autoPrint=false)
//   3. Este componente lia o localStorage, renderizava o HTML e chamava
//      window.print() — resultando em uma impressão CSS limpa.
//
// FLUXO ATUAL (ativo em src/services/weighing-pdf.ts):
//   1. handlePrint em scale-calculator.tsx chama generateWeighingPdf()
//   2. generateWeighingPdf() usa jsPDF + autoTable para montar um PDF em memória
//   3. Em plataforma nativa (Android/iOS), salva o PDF via @capacitor/filesystem
//      e abre o share sheet via @capacitor/share
//   4. Em web, chama doc.save() para download direto
//
// PARA REATIVAR ESTE MODELO:
//   1. Recriar as rotas:
//        src/app/balanca/page.tsx       → <PrintableScaleTicket autoPrint={true} />
//        src/app/balanca/preview/page.tsx → <PrintableScaleTicket autoPrint={false} />
//   2. Em scale-calculator.tsx, dentro de handlePrint(), antes de chamar
//      generateWeighingPdf(), gravar os dados no localStorage:
//        localStorage.setItem("scaleData", JSON.stringify({
//          weighingId: currentSessionId ?? "",
//          weighingSets,
//          headerData,
//          operationType,
//        }));
//      E em seguida redirecionar para a rota em vez de gerar o PDF:
//        router.push("/balanca");        // auto-print
//        router.push("/balanca/preview") // preview manual
//   3. Os tipos WeighingItem/WeighingSet abaixo podem ser substituídos por:
//        import type { WeighingItem, WeighingSet } from "@/components/scale/types";
//
// =============================================================================

/*
"use client";

import React, { useState, useEffect } from "react";
import type { OperationType, WeighingSet } from "@/components/scale/types";

interface ScaleData {
  weighingId: string;
  weighingSets: WeighingSet[];
  headerData: {
    client: string;
    plate: string;
    driver: string;
  };
  operationType: OperationType;
}

function isScaleData(value: unknown): value is ScaleData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ScaleData>;
  const header = candidate.headerData;
  const operationType = candidate.operationType;

  return (
    typeof candidate.weighingId === "string" &&
    Array.isArray(candidate.weighingSets) &&
    !!header &&
    typeof header.client === "string" &&
    typeof header.plate === "string" &&
    typeof header.driver === "string" &&
    (operationType === "loading" || operationType === "unloading")
  );
}

interface PrintableScaleTicketProps {
  autoPrint?: boolean;
}

export default function PrintableScaleTicket({ autoPrint = false }: PrintableScaleTicketProps) {
  const [data, setData] = useState<ScaleData | null>(null);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem("scaleData");

      if (savedData) {
        const parsedData: unknown = JSON.parse(savedData);
        if (!isScaleData(parsedData)) {
          console.warn("Dados de scaleData inválidos para impressão.");
          return;
        }
        setData(parsedData);

        if (parsedData.weighingId) {
          document.title = parsedData.weighingId;
        }

        if (autoPrint) {
          setTimeout(() => {
            try {
              window.print();
            } catch {
              console.log("Print automático bloqueado");
            }
          }, 800);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  if (!data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Carregando dados para impressão...
      </div>
    );
  }

  const { weighingId, weighingSets, headerData } = data;

  const formatNumber = (num: number, useGrouping = false) => {
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat("pt-BR", { useGrouping }).format(num);
  };

  const grandTotalLiquido = weighingSets.reduce((total, set) => {
    const setItemsTotal = set.items.reduce((acc, item) => acc + item.liquido, 0);
    return total + (setItemsTotal - set.descontoCacamba);
  }, 0);

  return (
    <>
      <div
        id="print-area"
        className="bg-white text-black font-sans text-xs w-full"
      >
        <div className="p-2">

          -- CABEÇALHO DA EMPRESA --
          <div className="text-center mb-2">
            <div className="text-[20pt] font-bold">PS INOX</div>
            <h1 className="text-lg font-bold uppercase">
              PSINOX COMERCIO DE AÇO LTDA
            </h1>
            <p>Fone: (16) 3761-9564 - Cel:(16) 99788-7055</p>
            <p className="font-bold">Nº da Pesagem: {weighingId}</p>
          </div>

          -- CLIENTE / PLACA / MOTORISTA --
          <div className="py-1 mb-2 text-xs">
            <div className="flex justify-between">
              <span>CLIENTE: {headerData.client}</span>
              <span>PLACA: {headerData.plate}</span>
              <span>MOTORISTA: {headerData.driver}</span>
            </div>
          </div>

          -- TABELAS POR CAÇAMBA --
          <div className="space-y-3">
            {weighingSets.map((set) => {
              const subtotalLiquido = set.items.reduce(
                (acc, item) => acc + item.liquido,
                0
              );
              const totalLiquidoSet = subtotalLiquido - set.descontoCacamba;

              return (
                <div key={set.id}>
                  <h3 className="font-bold uppercase text-center mb-1">
                    {set.name}
                  </h3>

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-t border-b border-dashed border-black">
                        <th className="text-left">PRODUTO</th>
                        <th className="text-right">BRUTO</th>
                        <th className="text-right">TARA</th>
                        <th className="text-right">DESC</th>
                        <th className="text-right">LÍQUIDO</th>
                      </tr>
                    </thead>

                    <tbody>
                      {set.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.material}</td>
                          <td className="text-right">{formatNumber(item.bruto)}</td>
                          <td className="text-right">{formatNumber(item.tara)}</td>
                          <td className="text-right">{formatNumber(item.descontos)}</td>
                          <td className="text-right">{formatNumber(item.liquido)}</td>
                        </tr>
                      ))}

                      <tr className="border-t border-dashed border-black">
                        <td colSpan={3}>DESCONTO CAÇAMBA</td>
                        <td colSpan={2} className="text-right">
                          -{formatNumber(set.descontoCacamba)}
                        </td>
                      </tr>

                      <tr className="font-bold">
                        <td colSpan={3}>TOTAL CAÇAMBA</td>
                        <td></td>
                        <td className="text-right">
                          {formatNumber(totalLiquidoSet)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          -- TOTAL GERAL --
          <div className="mt-4 pt-1 border-t border-dashed border-black">
            <div className="flex justify-between font-bold text-sm">
              <span>PESO LÍQUIDO TOTAL:</span>
              <span>{formatNumber(grandTotalLiquido)} KG</span>
            </div>
          </div>
        </div>
      </div>

      -- BOTÃO DE IMPRESSÃO MANUAL (não aparece na impressão via @media print) --
      <button
        onClick={handlePrint}
        className="mt-4 w-full bg-black text-white py-2 rounded print:hidden"
      >
        Imprimir
      </button>

      -- CSS DE IMPRESSÃO: oculta tudo exceto #print-area --
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }

          button {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
*/