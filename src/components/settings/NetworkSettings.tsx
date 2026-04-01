"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ScaleConfig } from "@/hooks/use-scale";

type TestStatus = "idle" | "testing-http" | "testing-tcp" | "testing-ws" | "success" | "error";

interface NetworkSettingsProps {
  scaleConfig: ScaleConfig;
  onScaleConfigChange: (newConfig: ScaleConfig) => void;
}

export function NetworkSettings({ scaleConfig, onScaleConfigChange }: NetworkSettingsProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [lastProtocol, setLastProtocol] = useState<"HTTP" | "TCP" | "WS" | "ALL" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const isTesting = testStatus === "testing-http" || testStatus === "testing-tcp" || testStatus === "testing-ws";

  const appendLog = (message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  const buildDiagnosticReport = (): string => {
    const host = scaleConfig.host || "(vazio)";
    const tcpHost = scaleConfig.tcpHost || scaleConfig.host || "(vazio)";
    const wsPort = Number(scaleConfig.wsPort) || 0;
    const httpPort = Number(scaleConfig.httpPort) || 0;
    const tcpPort = Number(scaleConfig.tcpPort) || 0;

    const reportLines = [
      "=== Diagnostico de Rede (BALANCA) ===",
      `Data/Hora: ${new Date().toLocaleString("pt-BR")}`,
      `Status: ${getStatusMessage()}`,
      `Ultimo protocolo testado: ${lastProtocol || "N/A"}`,
      "",
      "Configuracao:",
      `- Host (IP): ${host}`,
      `- Porta HTTP: ${httpPort}`,
      `- Porta WebSocket: ${wsPort}`,
      `- TCP Host: ${tcpHost}`,
      `- Porta TCP: ${tcpPort}`,
      "",
      "Logs:",
      ...(logs.length > 0 ? logs : ["(sem logs ainda)"]),
    ];

    return reportLines.join("\n");
  };

  const copyToClipboard = async (payload: string): Promise<void> => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(payload);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = payload;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error("copy_failed");
    }
  };

  const handleCopyDiagnostics = async () => {
    const payload = buildDiagnosticReport();

    try {
      await copyToClipboard(payload);
      appendLog("SUCESSO: diagnostico copiado para a area de transferencia.");
    } catch {
      appendLog("ERRO: nao foi possivel copiar o diagnostico.");
    }
  };

  const handleCopyTestLogs = async () => {
    const payload = logs.length > 0 ? logs.join("\n") : "(sem logs ainda)";

    try {
      await copyToClipboard(payload);
      appendLog("SUCESSO: logs de teste copiados para a area de transferencia.");
    } catch {
      appendLog("ERRO: nao foi possivel copiar os logs de teste.");
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleTestHttpConnection = async (): Promise<boolean> => {
    const host = scaleConfig.host.trim();
    const httpPort = Number(scaleConfig.httpPort);

    if (!host || !Number.isFinite(httpPort) || httpPort <= 0) {
      setTestStatus("error");
      setLastProtocol("HTTP");
      appendLog("ERRO HTTP: informe um host valido e uma porta HTTP maior que zero.");
      return false;
    }

    const endpoints = ["/peso", "/weight"];

    setTestStatus("testing-http");
    setLastProtocol("HTTP");
    appendLog(`Testando HTTP em ${host}:${httpPort}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let successPayload: string | null = null;
      let successEndpoint: string | null = null;

      for (const endpoint of endpoints) {
        const target = `http://${host}:${httpPort}${endpoint}`;
        const response = await fetch(target, { cache: "no-store", signal: controller.signal });

        if (!response.ok) {
          continue;
        }

        successPayload = await response.text();
        successEndpoint = endpoint;
        break;
      }

      clearTimeout(timeoutId);

      if (!successEndpoint) {
        throw new Error("Nenhum endpoint HTTP respondeu com sucesso (/peso ou /weight)");
      }

      setTestStatus("success");
      appendLog(`SUCESSO HTTP em ${successEndpoint}: ${JSON.stringify(successPayload)}`);
      return true;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      setTestStatus("error");
      if (error instanceof Error && error.name === "AbortError") {
        appendLog("ERRO HTTP: Timeout! A conexao demorou mais de 5 segundos.");
      } else {
        const message = error instanceof Error ? error.message : "Falha desconhecida ao testar conexao.";
        appendLog(`ERRO HTTP: ${message}`);
      }
      return false;
    }
  };

  const handleTestTcpConnection = async (): Promise<boolean> => {
    const host = (scaleConfig.tcpHost || scaleConfig.host).trim();
    const tcpPort = Number(scaleConfig.tcpPort);

    if (!host || !Number.isFinite(tcpPort) || tcpPort <= 0) {
      setTestStatus("error");
      setLastProtocol("TCP");
      appendLog("ERRO TCP: informe um host valido e uma porta TCP maior que zero.");
      return false;
    }

    if (!Capacitor.isNativePlatform()) {
      setTestStatus("error");
      setLastProtocol("TCP");
      appendLog("ERRO TCP: teste TCP so funciona no app nativo (Android/iOS).");
      return false;
    }

    setTestStatus("testing-tcp");
    setLastProtocol("TCP");
    appendLog(`Testando TCP em ${host}:${tcpPort}...`);

    let client: {
      connect: (args: { host: string; port: number }) => Promise<void>;
      addDataListener: (callback: (data: string) => void) => Promise<() => void>;
      disconnect: () => Promise<void>;
    } | null = null;
    let unsubscribe: (() => void) | null = null;
    let cleanupDone = false;

    try {
      const { TcpClientService } = await import("@/services/tcp-client");
      client = new TcpClientService();

      let resolveFirstPayload: ((value: string) => void) | null = null;
      const firstPayloadPromise = new Promise<string>((resolve) => {
        resolveFirstPayload = resolve;
      });

      unsubscribe = await client.addDataListener((data: string) => {
        if (resolveFirstPayload) {
          resolveFirstPayload(data);
          resolveFirstPayload = null;
        }
      });

      const connectPromise = client.connect({ host, port: tcpPort });
      // Avoid unhandled rejections if timeout wins the race first.
      void connectPromise.catch(() => undefined);
      const connectTimeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Timeout ao conectar TCP (3s).")), 3000);
      });

      await Promise.race([connectPromise, connectTimeoutPromise]);
      appendLog("SUCESSO TCP: conexao estabelecida.");

      const payloadTimeoutPromise = new Promise<"no-data">((resolve) => {
        window.setTimeout(() => resolve("no-data"), 2500);
      });

      const firstPayload = await Promise.race([firstPayloadPromise, payloadTimeoutPromise]);
      if (firstPayload !== "no-data") {
        appendLog(`SUCESSO TCP: primeiro payload recebido -> ${JSON.stringify(firstPayload)}`);
      } else {
        appendLog("AVISO TCP: conectou, mas nao recebeu payload em 2.5s.");
      }

      setTestStatus("success");

      unsubscribe?.();
      unsubscribe = null;
      await client.disconnect();
      cleanupDone = true;
      appendLog("TCP encerrado apos teste (sem impactar configuracao do app).");
      return true;
    } catch (error: unknown) {
      setTestStatus("error");
      const message = error instanceof Error ? error.message : "Falha desconhecida ao testar TCP.";
      appendLog(`ERRO TCP: ${message}`);
      return false;
    } finally {
      if (!cleanupDone) {
        try {
          unsubscribe?.();
        } catch {
          // ignore
        }

        try {
          await client?.disconnect();
        } catch {
          // ignore
        }
      }
    }
  };

  const handleTestWebSocketConnection = async (): Promise<boolean> => {
    const host = scaleConfig.host.trim();
    const wsPort = Number(scaleConfig.wsPort);

    if (!host || !Number.isFinite(wsPort) || wsPort <= 0) {
      setTestStatus("error");
      setLastProtocol("WS");
      appendLog("ERRO WS: informe um host valido e uma porta WebSocket maior que zero.");
      return false;
    }

    setTestStatus("testing-ws");
    setLastProtocol("WS");
    appendLog(`Testando WebSocket em ws://${host}:${wsPort}...`);

    const wsUrl = `ws://${host}:${wsPort}`;

    try {
      const result = await new Promise<"connected-only" | string>((resolve, reject) => {
        const socket = new WebSocket(wsUrl);
        let resolved = false;

        const closeAndResolve = (value: "connected-only" | string) => {
          if (resolved) return;
          resolved = true;
          try {
            socket.close();
          } catch {
            // ignore
          }
          resolve(value);
        };

        const closeAndReject = (message: string) => {
          if (resolved) return;
          resolved = true;
          try {
            socket.close();
          } catch {
            // ignore
          }
          reject(new Error(message));
        };

        const connectTimeout = window.setTimeout(() => {
          closeAndReject("Timeout ao conectar WebSocket (3s).");
        }, 3000);

        let payloadTimeout: number | null = null;

        socket.onopen = () => {
          window.clearTimeout(connectTimeout);
          appendLog("SUCESSO WS: conexao estabelecida.");

          payloadTimeout = window.setTimeout(() => {
            closeAndResolve("connected-only");
          }, 2500);
        };

        socket.onmessage = (event) => {
          if (payloadTimeout !== null) {
            window.clearTimeout(payloadTimeout);
          }
          const message = typeof event.data === "string" ? event.data : "[payload nao textual]";
          closeAndResolve(message);
        };

        socket.onerror = () => {
          if (payloadTimeout !== null) {
            window.clearTimeout(payloadTimeout);
          }
          window.clearTimeout(connectTimeout);
          closeAndReject("Falha no handshake WebSocket.");
        };
      });

      if (result === "connected-only") {
        appendLog("AVISO WS: conectou, mas nao recebeu payload em 2.5s.");
      } else {
        appendLog(`SUCESSO WS: primeiro payload recebido -> ${JSON.stringify(result)}`);
      }

      setTestStatus("success");
      appendLog("WS encerrado apos teste (sem impactar configuracao do app).");
      return true;
    } catch (error: unknown) {
      setTestStatus("error");
      const message = error instanceof Error ? error.message : "Falha desconhecida ao testar WebSocket.";
      appendLog(`ERRO WS: ${message}`);
      return false;
    }
  };

  const handleTestAllConnections = async () => {
    if (isTesting) {
      return;
    }

    setLastProtocol("ALL");
    appendLog("Iniciando bateria de testes: HTTP -> WS -> TCP...");

    const httpOk = await handleTestHttpConnection();
    const wsOk = await handleTestWebSocketConnection();

    const canRunTcp = Capacitor.isNativePlatform();
    const tcpOk = canRunTcp ? await handleTestTcpConnection() : null;
    if (!canRunTcp) {
      appendLog("AVISO TCP: teste pulado na bateria (disponivel apenas no app nativo).");
    }

    const appliedResults = [httpOk, wsOk, tcpOk].filter((result) => result !== null);
    const successCount = appliedResults.filter(Boolean).length;
    const expectedCount = appliedResults.length;
    const summary = `Resumo bateria: HTTP=${httpOk ? "OK" : "FALHA"} | WS=${wsOk ? "OK" : "FALHA"} | TCP=${tcpOk === null ? "PULADO" : tcpOk ? "OK" : "FALHA"}`;
    appendLog(summary);

    // Preserve ALL as the final context for status/report.
    setLastProtocol("ALL");

    if (successCount === expectedCount) {
      setTestStatus("success");
      appendLog(`Bateria finalizada com sucesso total (${successCount}/${expectedCount}).`);
      return;
    }

    setTestStatus("error");
    appendLog(`Bateria finalizada com falhas (${successCount}/${expectedCount}).`);
  };

  const getStatusClasses = (): string => {
    switch (testStatus) {
      case "testing-http":
      case "testing-tcp":
      case "testing-ws":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      case "error":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusMessage = (): string => {
    switch (testStatus) {
      case "idle":
        return "Aguardando teste...";
      case "testing-http":
        return "Testando conexao HTTP...";
      case "testing-tcp":
        return "Testando conexao TCP...";
      case "testing-ws":
        return "Testando conexao WebSocket...";
      case "success":
        if (lastProtocol === "ALL") return "Bateria de testes concluida com sucesso.";
        return `Conexao ${lastProtocol || ""} bem-sucedida!`.trim();
      case "error":
        if (lastProtocol === "ALL") return "Bateria de testes concluida com falhas.";
        return `Falha na conexao ${lastProtocol || ""}.`.trim();
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <DialogHeader className="pt-6">
        <DialogTitle>Rede</DialogTitle>
        <DialogDescription>
          Defina o endereco de rede (IP) e as portas do computador onde o servidor da balanca (ponte) esta rodando.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="browser-url" className="text-right">
            URL Navegador
          </Label>
          <Input
            id="browser-url"
            value={scaleConfig.browserUrl || ""}
            onChange={(e) => onScaleConfigChange({ ...scaleConfig, browserUrl: e.target.value })}
            className="col-span-3"
            placeholder="Ex: https://www.google.com"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="scale-ip" className="text-right">
            Host (IP)
          </Label>
          <Input
            id="scale-ip"
            value={scaleConfig.host}
            onChange={(e) =>
              onScaleConfigChange({
                ...scaleConfig,
                host: e.target.value,
                tcpHost: e.target.value,
              })
            }
            className="col-span-3"
            placeholder="Ex: 192.168.18.8"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="ws-port" className="text-right">
            Porta WebSocket
          </Label>
          <Input
            id="ws-port"
            type="number"
            value={scaleConfig.wsPort}
            onChange={(e) => onScaleConfigChange({ ...scaleConfig, wsPort: parseInt(e.target.value, 10) || 0 })}
            className="col-span-3"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="http-port" className="text-right">
            Porta HTTP
          </Label>
          <Input
            id="http-port"
            type="number"
            value={scaleConfig.httpPort}
            onChange={(e) => onScaleConfigChange({ ...scaleConfig, httpPort: parseInt(e.target.value, 10) || 0 })}
            className="col-span-3"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tcp-port" className="text-right">
            Porta TCP
          </Label>
          <Input
            id="tcp-port"
            type="number"
            value={scaleConfig.tcpPort ?? 8080}
            onChange={(e) => onScaleConfigChange({ ...scaleConfig, tcpPort: parseInt(e.target.value, 10) || 0 })}
            className="col-span-3"
            placeholder="Ex: 8080"
          />
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <div className="flex justify-between items-center gap-2 mb-2">
          <h4 className="text-sm font-medium">Painel de Teste de Portas</h4>
          <Button
            variant="default"
            size="sm"
            onClick={handleTestAllConnections}
            disabled={isTesting}
          >
            Testar tudo
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestHttpConnection}
            disabled={isTesting}
          >
            Testar HTTP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestTcpConnection}
            disabled={isTesting}
          >
            Testar TCP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestWebSocketConnection}
            disabled={isTesting}
          >
            Testar WS
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyTestLogs}
          >
            Copiar logs de teste
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLogs}
          >
            Limpar logs
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyDiagnostics}
          >
            Copiar diagnostico completo
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Dica: mantenha HTTP 3000, WS 3001 e TCP 8080. Cada botao testa seu protocolo correto.
        </p>

        <div className={cn("text-sm font-semibold p-2 rounded-md bg-muted/50", getStatusClasses())}>
          Status: {getStatusMessage()}
        </div>

        <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          O teste TCP e apenas validacao de conectividade/payload. Nao altera o destino final do visor de peso.
        </div>

        <ScrollArea className="h-28 w-full rounded-md border p-2 bg-muted/50">
          <div className="text-xs font-mono">
            {logs.map((log, index) => (
              <p key={index} className="whitespace-pre-wrap">
                {log}
              </p>
            ))}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}
