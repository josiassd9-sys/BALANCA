"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ChevronDown, ChevronRight } from "lucide-react";
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

const NETWORK_PREF_KEYS = {
  ipv4MaskEnabled: "networkSettings.ipv4MaskEnabled",
  persistTestLogs: "networkSettings.persistTestLogs",
  testLogs: "networkSettings.testLogs",
  preferencesExpanded: "networkSettings.preferencesExpanded",
} as const;

const readBooleanPreference = (key: string, fallback: boolean): boolean => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // Ignora falhas de localStorage para não afetar o fluxo principal.
  }
  return fallback;
};

const writePreference = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignora falhas de localStorage para não afetar o fluxo principal.
  }
};

export function NetworkSettings({ scaleConfig, onScaleConfigChange }: NetworkSettingsProps) {
  const preferencesHydratedRef = useRef(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [lastProtocol, setLastProtocol] = useState<"HTTP" | "TCP" | "WS" | "ALL" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [hostDraft, setHostDraft] = useState<string>(scaleConfig.host || "");
  const [ipv4MaskEnabled, setIpv4MaskEnabled] = useState<boolean>(true);
  const [persistTestLogs, setPersistTestLogs] = useState<boolean>(false);
  const [preferencesExpanded, setPreferencesExpanded] = useState<boolean>(true);
  const [isHostFocused, setIsHostFocused] = useState<boolean>(false);
  const [hostBlurFeedback, setHostBlurFeedback] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [wsPortDraft, setWsPortDraft] = useState<string>(scaleConfig.wsPort != null ? String(scaleConfig.wsPort) : "");
  const [httpPortDraft, setHttpPortDraft] = useState<string>(scaleConfig.httpPort != null ? String(scaleConfig.httpPort) : "");
  const [tcpPortDraft, setTcpPortDraft] = useState<string>(scaleConfig.tcpPort != null ? String(scaleConfig.tcpPort) : "");
  const [focusedPortField, setFocusedPortField] = useState<"ws" | "http" | "tcp" | null>(null);

  const isTesting = testStatus === "testing-http" || testStatus === "testing-tcp" || testStatus === "testing-ws";

  useEffect(() => {
    setHostDraft(scaleConfig.host || "");
  }, [scaleConfig.host]);

  useEffect(() => {
    setIpv4MaskEnabled(readBooleanPreference(NETWORK_PREF_KEYS.ipv4MaskEnabled, true));
    const shouldPersistLogs = readBooleanPreference(NETWORK_PREF_KEYS.persistTestLogs, false);
    setPersistTestLogs(shouldPersistLogs);
    setPreferencesExpanded(readBooleanPreference(NETWORK_PREF_KEYS.preferencesExpanded, true));

    if (!shouldPersistLogs) {
      preferencesHydratedRef.current = true;
      return;
    }

    try {
      const rawLogs = window.localStorage.getItem(NETWORK_PREF_KEYS.testLogs);
      if (!rawLogs) {
        return;
      }

      const parsed = JSON.parse(rawLogs);
      if (Array.isArray(parsed)) {
        setLogs(parsed.filter((line) => typeof line === "string"));
      }
    } catch {
      // Ignora falhas de localStorage para não afetar o fluxo principal.
    }

    preferencesHydratedRef.current = true;
  }, []);

  useEffect(() => {
    writePreference(NETWORK_PREF_KEYS.ipv4MaskEnabled, String(ipv4MaskEnabled));
  }, [ipv4MaskEnabled]);

  useEffect(() => {
    writePreference(NETWORK_PREF_KEYS.persistTestLogs, String(persistTestLogs));
  }, [persistTestLogs]);

  useEffect(() => {
    writePreference(NETWORK_PREF_KEYS.preferencesExpanded, String(preferencesExpanded));
  }, [preferencesExpanded]);

  useEffect(() => {
    if (!preferencesHydratedRef.current) {
      return;
    }

    if (!persistTestLogs) {
      try {
        window.localStorage.removeItem(NETWORK_PREF_KEYS.testLogs);
      } catch {
        // Ignora falhas de localStorage para não afetar o fluxo principal.
      }
      return;
    }

    const limitedLogs = logs.slice(0, 120);
    writePreference(NETWORK_PREF_KEYS.testLogs, JSON.stringify(limitedLogs));
  }, [persistTestLogs, logs]);

  useEffect(() => {
    setWsPortDraft(scaleConfig.wsPort != null ? String(scaleConfig.wsPort) : "");
  }, [scaleConfig.wsPort]);

  useEffect(() => {
    setHttpPortDraft(scaleConfig.httpPort != null ? String(scaleConfig.httpPort) : "");
  }, [scaleConfig.httpPort]);

  useEffect(() => {
    setTcpPortDraft(scaleConfig.tcpPort != null ? String(scaleConfig.tcpPort) : "");
  }, [scaleConfig.tcpPort]);

  const parsePortDraft = (raw: string): number | undefined => {
    const digitsOnly = raw.replace(/\D+/g, "");
    if (!digitsOnly) return undefined;

    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return undefined;

    if (parsed < 1 || parsed > 65535) return undefined;

    return parsed;
  };

  const isPortDraftOutOfRange = (raw: string): boolean => {
    const digitsOnly = raw.replace(/\D+/g, "");
    if (!digitsOnly) return false;

    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return false;

    return parsed < 1 || parsed > 65535;
  };

  const normalizeIpv4Draft = (raw: string): string => {
    if (/[^\d.]/.test(raw)) {
      // Mantem hostnames e dominios quando houver letras/simbolos validos de host.
      return raw;
    }

    const sanitized = raw.replace(/[^\d.]/g, "");
    let result = "";
    let currentOctet = "";
    let dotCount = 0;

    for (const char of sanitized) {
      if (/\d/.test(char)) {
        if (currentOctet.length >= 3) {
          continue;
        }
        currentOctet += char;
        result += char;
        continue;
      }

      if (char === ".") {
        if (!currentOctet || dotCount >= 3) {
          continue;
        }
        result += ".";
        dotCount += 1;
        currentOctet = "";
      }
    }

    return result;
  };

  const isCompleteIpv4 = (value: string): boolean => {
    const v = value.trim();
    if (!v) return false;
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return ipv4Regex.test(v);
  };

  const isLikelyHostnameOrDomain = (value: string): boolean => {
    const v = value.trim();
    if (!v) return false;
    const hostRegex = /^(?=.{1,253}$)(localhost|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;
    return hostRegex.test(v);
  };

  const hostHint = (() => {
    if (!hostDraft.trim()) {
      return "Aplicado automaticamente no HTTP, WebSocket e TCP.";
    }
    if (ipv4MaskEnabled && !isCompleteIpv4(hostDraft)) {
      return "Mascara IPv4 ativa para entradas numericas; hostnames e dominios seguem liberados.";
    }
    if (ipv4MaskEnabled && isCompleteIpv4(hostDraft)) {
      return "IPv4 valido detectado e propagado em tempo real para os protocolos.";
    }
    return "Modo livre: voce pode usar IPv4, hostname ou dominio.";
  })();

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
    let host = (scaleConfig.tcpHost || scaleConfig.host).trim();
    // Se tcpHost for localhost ou 127.0.0.1, usar o mesmo IP do HTTP
    if (host === "127.0.0.1" || host === "localhost" || !host) {
      host = (scaleConfig.host || "192.168.18.13").trim();
    }
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

        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="scale-ip" className="text-right pt-2">
            Host (IP)
          </Label>
          <div className="col-span-3 space-y-1">
            <Input
              id="scale-ip"
              value={hostDraft}
              onFocus={() => {
                setIsHostFocused(true);
                setHostBlurFeedback(null);
              }}
              onBlur={() => {
                setIsHostFocused(false);
                const trimmed = hostDraft.trim();
                if (!trimmed) {
                  setHostBlurFeedback(null);
                  return;
                }

                if (isCompleteIpv4(trimmed) || isLikelyHostnameOrDomain(trimmed)) {
                  setHostBlurFeedback({ tone: "success", text: "Host válido." });
                } else {
                  setHostBlurFeedback({ tone: "warning", text: "Host parece inválido. Verifique IP ou hostname." });
                }
              }}
              onChange={(e) => {
                const raw = e.target.value;
                const nextHost = ipv4MaskEnabled ? normalizeIpv4Draft(raw) : raw;

                setHostDraft(nextHost);
                onScaleConfigChange({
                  ...scaleConfig,
                  host: nextHost,
                  tcpHost: nextHost,
                });
              }}
              placeholder="Ex: 192.168.18.8"
            />
            {isHostFocused ? (
              <p className={cn("text-xs", ipv4MaskEnabled && hostDraft.trim() && !isCompleteIpv4(hostDraft) ? "text-amber-600" : "text-muted-foreground")}>{hostHint}</p>
            ) : null}
            {!isHostFocused && hostBlurFeedback ? (
              <p className={cn("text-xs", hostBlurFeedback.tone === "success" ? "text-emerald-600" : "text-amber-600")}>{hostBlurFeedback.text}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 items-start gap-4">
          <Label className="text-right pt-2">Preferencias</Label>
          <div className="col-span-3 rounded-md border border-dashed p-3 space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-between text-xs font-medium text-foreground"
              onClick={() => setPreferencesExpanded((prev) => !prev)}
              aria-expanded={preferencesExpanded}
              aria-label={preferencesExpanded ? "Ocultar preferencias da tela de rede" : "Mostrar preferencias da tela de rede"}
            >
              <span>Preferencias da Tela de Rede</span>
              {preferencesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {preferencesExpanded ? (
              <>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={ipv4MaskEnabled}
                    onChange={(e) => setIpv4MaskEnabled(e.target.checked)}
                  />
                  Usar mascara IPv4 suave (opcional)
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={persistTestLogs}
                    onChange={(e) => setPersistTestLogs(e.target.checked)}
                  />
                  Persistir logs de teste
                </label>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="ws-port" className="text-right">
            Porta WebSocket
          </Label>
          <Input
            id="ws-port"
            type="text"
            inputMode="numeric"
            value={wsPortDraft}
            onFocus={() => setFocusedPortField("ws")}
            onBlur={() => setFocusedPortField((prev) => (prev === "ws" ? null : prev))}
            onChange={(e) => {
              const raw = e.target.value;
              setWsPortDraft(raw);
              onScaleConfigChange({ ...scaleConfig, wsPort: parsePortDraft(raw) });
            }}
            className="col-span-3"
            placeholder="Ex: 3001"
          />
          <div className="col-start-2 col-span-3">
            {focusedPortField === "ws" && isPortDraftOutOfRange(wsPortDraft) ? (
              <p className="text-xs text-amber-600">Porta WebSocket deve estar entre 1 e 65535.</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="http-port" className="text-right">
            Porta HTTP
          </Label>
          <Input
            id="http-port"
            type="text"
            inputMode="numeric"
            value={httpPortDraft}
            onFocus={() => setFocusedPortField("http")}
            onBlur={() => setFocusedPortField((prev) => (prev === "http" ? null : prev))}
            onChange={(e) => {
              const raw = e.target.value;
              setHttpPortDraft(raw);
              onScaleConfigChange({ ...scaleConfig, httpPort: parsePortDraft(raw) });
            }}
            className="col-span-3"
            placeholder="Ex: 3000"
          />
          <div className="col-start-2 col-span-3">
            {focusedPortField === "http" && isPortDraftOutOfRange(httpPortDraft) ? (
              <p className="text-xs text-amber-600">Porta HTTP deve estar entre 1 e 65535.</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tcp-port" className="text-right">
            Porta TCP
          </Label>
          <Input
            id="tcp-port"
            type="text"
            inputMode="numeric"
            value={tcpPortDraft}
            onFocus={() => setFocusedPortField("tcp")}
            onBlur={() => setFocusedPortField((prev) => (prev === "tcp" ? null : prev))}
            onChange={(e) => {
              const raw = e.target.value;
              setTcpPortDraft(raw);
              onScaleConfigChange({ ...scaleConfig, tcpPort: parsePortDraft(raw) });
            }}
            className="col-span-3"
            placeholder="Ex: 8080"
          />
          <div className="col-start-2 col-span-3">
            {focusedPortField === "tcp" && isPortDraftOutOfRange(tcpPortDraft) ? (
              <p className="text-xs text-amber-600">Porta TCP deve estar entre 1 e 65535.</p>
            ) : null}
          </div>
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
