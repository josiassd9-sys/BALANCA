import { registerPlugin } from '@capacitor/core';

export interface FolderOpenerPlugin {
  openDocumentsSubfolder(options: { folderName: string }): Promise<{ opened: boolean }>;
}

export const FolderOpener = registerPlugin<FolderOpenerPlugin>('FolderOpener');
