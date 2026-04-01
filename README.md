# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Network & Scale Configuration

The application can operate in two modes:

1. **Bridge server (WebSocket/HTTP)** – the default for the web interface. The settings dialog lets
   you specify the host, WebSocket port and HTTP port of a local `scale-server` process that
   forwards data from the physical scale.
2. **Direct TCP connection** – available when running in a Capacitor native build (Android/iOS).
   The same settings dialog now includes **TCP Host** and **TCP Port** fields; values entered there
   are persisted and used by the mobile app to open a raw TCP socket directly to the scale
   (e.g. `192.168.18.13:8080`).

Change the values via the gear icon in the top bar and hit *Salvar e Fechar* to apply.
