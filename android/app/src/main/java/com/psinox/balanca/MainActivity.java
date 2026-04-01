package com.psinox.balanca;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.psinox.balanca.FolderOpenerPlugin;
import com.psinox.balanca.TcpClientPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // registra o plugin TCP
        registerPlugin(TcpClientPlugin.class);
        registerPlugin(FolderOpenerPlugin.class);
    }
}