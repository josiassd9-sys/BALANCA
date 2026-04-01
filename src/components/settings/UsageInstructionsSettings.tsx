"use client";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function UsageInstructionsSettings() {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Instrucoes de Uso</DialogTitle>
        <DialogDescription>
          Manual completo do aplicativo de pesagem, com fluxo recomendado do inicio ao fim.
        </DialogDescription>
      </DialogHeader>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">1. Visao Geral do App</h3>
        <p className="text-sm text-muted-foreground">
          O aplicativo controla pesagens em sessoes, organiza materiais por cacamba, calcula peso liquido automaticamente,
          gera comprovante em PDF e permite personalizar aparencia e impressao no menu de configuracoes.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">2. Preparacao da Rede e da Ponte</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            No computador da ponte, execute o arquivo balanca.js (ou o servidor equivalente) para ler a balanca na serial e publicar os dados na rede.
          </li>
          <li>
            No menu Configuracoes, abra Rede e preencha Host (IP), Porta WebSocket e Porta HTTP com os mesmos valores do servidor.
          </li>
          <li>
            Clique em Testar Conexao para validar a resposta do endpoint HTTP de peso.
          </li>
        </ol>

        <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Botao Navegador (acesso rapido)</p>
          <p>
            No topo da tela principal existe o botao Navegador. Ele abre a URL definida em Configuracoes &gt; Rede &gt; URL Navegador.
          </p>
          <p>
            Voce pode salvar qualquer pagina de apoio para acesso rapido, por exemplo: https://grok.com ou https://google.com.
          </p>
          <p>
            Essa URL e opcional e funciona como atalho utilitario para consulta durante a operacao.
          </p>
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Conexoes comuns da ponte (balanca.js)</p>
          <p>TCP: porta 8080 para cliente TCP.</p>
          <p>WebSocket: porta 3001 para leitura em tempo real.</p>
          <p>HTTP: porta 3000, endpoint /peso para teste e leitura de peso.</p>
          <p>Status: endpoint /status para diagnostico rapido.</p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">3. Inicio de uma Pesagem</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Abra ou crie uma sessao no seletor de pesagens em aberto.</li>
          <li>Defina o tipo de operacao: Carregamento ou Descarregamento.</li>
          <li>Preencha Cliente, Motorista e Placa no cabecalho da sessao.</li>
          <li>Informe o Peso Inicial no campo correspondente.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          O app salva e retoma sessoes em aberto automaticamente. Se ja existir sessao aberta, ela volta ao abrir o sistema.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">4. Materiais, Cacambas e Campos</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Clique em Adicionar material dentro da cacamba ativa.</li>
          <li>Digite o nome do material no campo Material (autocomplete com catalogo).</li>
          <li>Preencha Bruto e Tara conforme o tipo de operacao atual.</li>
          <li>Use A/L para descontos adicionais quando necessario.</li>
          <li>O Liquido e calculado automaticamente: Bruto - Tara - A/L.</li>
          <li>Se houver desconto geral da cacamba, use o campo Desconto (kg) no rodape da cacamba.</li>
        </ol>

        <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Boas praticas de preenchimento</p>
          <p>Use nomes de material padronizados para facilitar filtro e historico.</p>
          <p>Revise sempre Cliente, Motorista e Placa antes de salvar ou finalizar.</p>
          <p>Confirme pesos capturados em campo antes de travar o fluxo.</p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">5. Salvar, Finalizar e PDF</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Salvar: atualiza a sessao em aberto sem encerrar edicao.</li>
          <li>Finalizar: encerra a sessao, bloqueia edicao e gera comprovante PDF.</li>
          <li>Imprimir: gera PDF manualmente para download (web) ou compartilhamento (app nativo).</li>
          <li>Lista FIN: consulta comprovantes finalizados, permite atualizar lista e compartilhar arquivos.</li>
        </ol>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">6. Catalogo de Materiais</h3>
        <p className="text-sm text-muted-foreground">
          Em Catalogo de Materiais, voce pode adicionar, editar e remover itens. O autocomplete dos campos Material
          usa esse catalogo para acelerar digitacao e reduzir erros de nomenclatura.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">7. Backup da Ponte</h3>
        <p className="text-sm text-muted-foreground">
          Em Backup da Ponte, o app centraliza o arquivo balanca.js para copia, download, compartilhamento e restauracao.
          Use esse recurso para padronizar instalacoes e recuperar rapidamente em caso de troca ou formatacao de maquina.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">8. Aparencia e Cores</h3>
        <p className="text-sm text-muted-foreground">
          Em Aparencia, ajuste tema, fontes, tamanho, sombras, animacoes e cores individualizadas da interface.
          Use a pre-visualizacao ao vivo para validar conforto visual e legibilidade antes de aplicar no uso diario.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">9. Impressao e Layout do Comprovante</h3>
        <p className="text-sm text-muted-foreground">
          Em Impressao, personalize o cabecalho do PDF: logo, razao social, telefone e endereco (rua, bairro e cidade),
          com fonte, estilo e tamanho. Essas configuracoes refletem na geracao real do comprovante.
        </p>
        <p className="text-sm text-muted-foreground">
          Recomendacao: ajuste texto e tamanho em pequenas etapas e gere um PDF de teste para confirmar alinhamento.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">10. Fluxo Recomendado no Dia a Dia</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Validar conexao da balanca em Rede.</li>
          <li>Criar ou abrir sessao de pesagem.</li>
          <li>Definir tipo de operacao e preencher cabecalho.</li>
          <li>Lancar materiais e pesos por cacamba.</li>
          <li>Salvar durante a operacao para evitar perda de dados.</li>
          <li>Finalizar quando concluir e compartilhar o PDF.</li>
          <li>Consultar a Lista FIN para reenvios e historico de comprovantes.</li>
        </ol>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold">11. Solucao de Problemas Rapida</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Sem peso em tempo real: revisar IP, portas e se o servidor da ponte esta ativo.</li>
          <li>Falha no teste HTTP: validar endpoint /peso e firewall da maquina da ponte.</li>
          <li>PDF nao aparece no dispositivo: abrir Lista FIN e atualizar a lista.</li>
          <li>Autocomplete sem sugestoes: revisar o Catalogo de Materiais.</li>
        </ul>
      </section>
    </div>
  );
}
