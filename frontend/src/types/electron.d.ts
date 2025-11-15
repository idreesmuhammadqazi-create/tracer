export interface ElectronAPI {
  showSaveDialog(): Promise<{ canceled: boolean; filePath?: string }>;
  showExportDialog(): Promise<{ canceled: boolean; filePath?: string }>;
  saveFile(content: string, filePath: string): Promise<void>;
  openFile(): Promise<{ canceled: boolean; filePath?: string; content?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};