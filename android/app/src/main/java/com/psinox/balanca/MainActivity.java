package com.psinox.balanca;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.psinox.balanca.FolderOpenerPlugin;
import com.psinox.balanca.TcpClientPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Os plugins devem ser registrados ANTES de super.onCreate()
        // para que o Capacitor bridge os inclua na inicialização.
        registerPlugin(TcpClientPlugin.class);
        registerPlugin(FolderOpenerPlugin.class);

        super.onCreate(savedInstanceState);
    }
}