package com.psinox.balanca;

import android.app.Activity;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "TcpClient")
public class TcpClientPlugin extends Plugin {

    private static final String TAG = "TcpClientPlugin";

    private Socket socket;
    private Thread connectionThread;
    private boolean isConnected = false;

    @PluginMethod
    public void connect(PluginCall call) {
        String host = call.getString("host", "192.168.18.13");
        int port = call.getInt("port", 8080);

        Log.d(TAG, "connect() called with host=" + host + " port=" + port);

        if (isConnected) {
            Log.d(TAG, "Already connected - rejecting call");
            call.reject("Already connected");
            return;
        }

        connectionThread = new Thread(() -> {
            try {
                socket = new Socket(host, port);
                isConnected = true;

                JSObject ret = new JSObject();
                ret.put("connected", true);
                resolveOnMainThread(call, ret);

                Log.d(TAG, "Socket connected - starting listenForData");

                // Start listening for data
                listenForData();

            } catch (IOException e) {
                isConnected = false;
                Log.e(TAG, "Connection failed: " + e.getMessage(), e);
                rejectOnMainThread(call, "Connection failed: " + e.getMessage());
            }
        });
        connectionThread.start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        Log.d(TAG, "disconnect() called");
        if (socket != null && !socket.isClosed()) {
            try {
                socket.close();
                isConnected = false;
                if (connectionThread != null) {
                    connectionThread.interrupt();
                }
                Log.d(TAG, "Socket closed successfully");
            } catch (IOException e) {
                Log.e(TAG, "Error closing socket: " + e.getMessage(), e);
            }
        }
        JSObject ret = new JSObject();
        ret.put("disconnected", true);
        resolveOnMainThread(call, ret);
    }

    @PluginMethod
    public void send(PluginCall call) {
        Log.d(TAG, "send() called");
        if (socket == null || socket.isClosed()) {
            Log.w(TAG, "send() rejected: Not connected");
            call.reject("Not connected");
            return;
        }
        String data = call.getString("data", "");
        try {
            socket.getOutputStream().write(data.getBytes(StandardCharsets.UTF_8));
            socket.getOutputStream().flush();
            JSObject ret = new JSObject();
            ret.put("sent", true);
            resolveOnMainThread(call, ret);
            Log.d(TAG, "Data sent: " + data);
        } catch (IOException e) {
            Log.e(TAG, "Send failed: " + e.getMessage(), e);
            rejectOnMainThread(call, "Send failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void close(PluginCall call) {
        Log.d(TAG, "close() called - delegating to disconnect");
        // Alias to disconnect, same behaviour
        disconnect(call);
    }

    private void listenForData() {
        new Thread(() -> {
            try {
                BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                String line;
                while (isConnected && (line = reader.readLine()) != null) {
                    Log.d(TAG, "Received data: " + line);
                    JSObject data = new JSObject();
                    data.put("data", line);
                    notifyListeners("onData", data);
                }
            } catch (IOException e) {
                Log.e(TAG, "Error while listening for data: " + e.getMessage(), e);
                if (isConnected) {
                    JSObject error = new JSObject();
                    error.put("error", e.getMessage());
                    notifyListeners("onError", error);
                }
            } finally {
                isConnected = false;
                Log.d(TAG, "listenForData thread ending, isConnected set to false");
            }
        }).start();
    }

    private void resolveOnMainThread(PluginCall call, JSObject payload) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> call.resolve(payload));
            return;
        }

        call.resolve(payload);
    }

    private void rejectOnMainThread(PluginCall call, String message) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> call.reject(message));
            return;
        }

        call.reject(message);
    }
}