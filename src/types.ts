
import { CodeLanguage, AppTheme, EditorTheme } from './store/useAppStore';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  content: string;
}

export interface FolderItem {
  id: string;
  name: string;
  path: string;
}
