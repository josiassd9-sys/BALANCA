package com.psinox.balanca;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FolderOpener")
public class FolderOpenerPlugin extends Plugin {

    @PluginMethod
    public void openDocumentsSubfolder(PluginCall call) {
        String folderName = call.getString("folderName", "PesagensFinalizadas");
        Activity activity = getActivity();

        if (activity == null) {
            call.reject("Activity indisponivel");
            return;
        }

        try {
            String documentId = "primary:Documents/" + folderName;
            Uri folderUri = Uri.parse("content://com.android.externalstorage.documents/document/" + Uri.encode(documentId));

            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(folderUri, DocumentsContract.Document.MIME_TYPE_DIR);
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

            if (viewIntent.resolveActivity(activity.getPackageManager()) != null) {
                activity.startActivity(viewIntent);

                JSObject result = new JSObject();
                result.put("opened", true);
                call.resolve(result);
                return;
            }

            Intent treeIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            treeIntent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, folderUri);
            treeIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(treeIntent);

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Nao foi possivel abrir a pasta de documentos", ex);
        }
    }
}
