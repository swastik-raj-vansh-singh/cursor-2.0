import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as monaco from "monaco-editor";

export type CodeLanguage = "javascript" | "typescript" | "csharp" | "python";

export type EditorTheme = "vs-dark" | "vs-light";

export type AppTheme = "dark" | "light";

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

interface CodeSnapshot {
  content: string;
  timestamp: number;
  selection?: monaco.Selection;
}

interface AppState {
  // Theme state
  theme: AppTheme;
  editorTheme: EditorTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;

  // Editor state
  code: string;
  language: CodeLanguage;
  fontSize: number;
  lineHeight: number;
  setCode: (code: string) => void;
  setLanguage: (language: CodeLanguage) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;

  // Selected code for AI Assistant
  selectedCode: string | null;
  setSelectedCode: (code: string | null) => void;

  // Code history
  snapshots: CodeSnapshot[];
  currentSnapshotIndex: number;
  takeSnapshot: (content: string, selection?: monaco.Selection) => void;
  undo: () => void;
  canUndo: () => boolean;

  // AI suggestions
  aiPrompt: string;
  suggestionCode: string;
  isLoadingSuggestion: boolean;
  setAiPrompt: (prompt: string) => void;
  setSuggestionCode: (code: string) => void;
  setIsLoadingSuggestion: (isLoading: boolean) => void;

  // File explorer
  openFiles: FileItem[];
  activeFile: FileItem | null;
  addFile: (file: FileItem) => void;
  addFolder: (folder: FolderItem) => void;
  setActiveFile: (file: FileItem) => void;
  closeFile: (fileId: string) => void;
  refreshExplorer: () => void;
  clearFilesTree: () => void;

  // Terminal
  isTerminalOpen: boolean;
  toggleTerminal: () => void;

  // UI state
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleSettings: () => void;

  // ADD this new property for sidebar explorer state (simulate as mock)
  filesTree: any[];
}

// add a top-level filesTree for explorer state
// add findFileById to help search
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme state - default to dark
      theme: "dark",
      editorTheme: "vs-dark",
      setTheme: (theme) =>
        set({
          theme,
          editorTheme: theme === "dark" ? "vs-dark" : "vs-light",
        }),
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        set({
          theme: newTheme,
          editorTheme: newTheme === "dark" ? "vs-dark" : "vs-light",
        });
      },

      // Editor state
      code: '// Game code goes here...\n\nfunction Player(name, health) {\n  this.name = name;\n  this.health = health;\n  \n  this.attack = function(target) {\n    console.log(this.name + " attacks " + target.name);\n    return Math.floor(Math.random() * 10) + 1;\n  }\n}\n\nconst hero = new Player("Hero", 100);\nconst enemy = new Player("Enemy", 50);\n\nlet damage = hero.attack(enemy);\nconsole.log("Damage dealt: " + damage);',
      language: "javascript",
      fontSize: 14,
      lineHeight: 20,
      setCode: (code) => {
        const { takeSnapshot, activeFile } = get();

        if (activeFile) {
          // Update active file content
          set((state) => ({
            openFiles: state.openFiles.map((file) =>
              file.id === activeFile.id ? { ...file, content: code } : file
            ),
            activeFile: { ...activeFile, content: code },
          }));
        } else {
          // Update global code state
          set({ code });
        }

        takeSnapshot(code);
      },
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),

      // Selected code for AI Assistant
      selectedCode: null,
      setSelectedCode: (code) => set({ selectedCode: code }),

      // Code history
      snapshots: [],
      currentSnapshotIndex: -1,
      takeSnapshot: (content, selection) => {
        const snapshot: CodeSnapshot = {
          content,
          timestamp: Date.now(),
          selection,
        };

        const { snapshots, currentSnapshotIndex } = get();

        // Limit to 50 snapshots
        const newSnapshots = [
          ...snapshots.slice(0, currentSnapshotIndex + 1),
          snapshot,
        ].slice(-50);

        set({
          snapshots: newSnapshots,
          currentSnapshotIndex: newSnapshots.length - 1,
        });
      },
      undo: () => {
        const { snapshots, currentSnapshotIndex, activeFile } = get();

        if (currentSnapshotIndex > 0) {
          const prevSnapshot = snapshots[currentSnapshotIndex - 1];

          if (activeFile) {
            // Update active file content
            set((state) => ({
              openFiles: state.openFiles.map((file) =>
                file.id === activeFile.id
                  ? { ...file, content: prevSnapshot.content }
                  : file
              ),
              activeFile: { ...activeFile, content: prevSnapshot.content },
              currentSnapshotIndex: currentSnapshotIndex - 1,
            }));
          } else {
            // Update global code state
            set({
              code: prevSnapshot.content,
              currentSnapshotIndex: currentSnapshotIndex - 1,
            });
          }
        }
      },
      canUndo: () => {
        const { currentSnapshotIndex } = get();
        return currentSnapshotIndex > 0;
      },

      // AI suggestions
      aiPrompt: "",
      suggestionCode: "",
      isLoadingSuggestion: false,
      setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
      setSuggestionCode: (code) => set({ suggestionCode: code }),
      setIsLoadingSuggestion: (isLoading) =>
        set({ isLoadingSuggestion: isLoading }),

      // File explorer
      openFiles: [],
      activeFile: null,

      setActiveFile: (file) => {
        const { openFiles } = get();

        // Check if file is already open
        if (!openFiles.some((f) => f.id === file.id)) {
          set((state) => ({
            openFiles: [...state.openFiles, file],
            activeFile: file,
          }));
        } else {
          set({ activeFile: file });
        }
      },
      closeFile: (fileId) => {
        set((state) => {
          const newOpenFiles = state.openFiles.filter((f) => f.id !== fileId);

          // If we closed the active file, set the first remaining file as active
          let newActiveFile = state.activeFile;
          if (state.activeFile && state.activeFile.id === fileId) {
            newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[0] : null;
          }

          return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
          };
        });
      },

      // Terminal
      isTerminalOpen: false,
      toggleTerminal: () =>
        set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),

      // UI state
      isSidebarOpen: true,
      isCommandPaletteOpen: false,
      isSettingsOpen: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
      toggleSettings: () =>
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

      // ADD this new property for sidebar explorer state (simulate as mock)
      filesTree: [],

      // PATCH addFile & addFolder to update filesTree in-memory
      addFile: (file: FileItem) => {
        set((state) => {
          // First check if the file already exists to avoid duplicates
          const fileExists = state.openFiles.some((f) => f.id === file.id);
          if (fileExists) {
            return { activeFile: file };
          }

          // Add file to openFiles array and set it as active
          const newOpenFiles = [...state.openFiles, file];

          // Now add the file to the filesTree structure
          const updatedFilesTree = [...state.filesTree];

          // Extract the directory path from the file's path
          const filePath = file.path;
          const lastSlashIndex = filePath.lastIndexOf("/");
          const directoryPath =
            lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : "";

          // Find the target directory or use root if not found
          let targetDirectory = null;

          // Function to recursively find the directory by path
          const findDirectoryByPath = (items: any[], path: string): any => {
            for (const item of items) {
              if (item.type === "folder") {
                if (item.path === path) {
                  return item;
                }
                if (item.children) {
                  const found = findDirectoryByPath(item.children, path);
                  if (found) return found;
                }
              }
            }
            return null;
          };

          // Try to find the target directory by path
          if (directoryPath) {
            targetDirectory = findDirectoryByPath(
              updatedFilesTree,
              directoryPath
            );
          }

          // If no directory found, add to root
          if (!targetDirectory) {
            updatedFilesTree.push({
              id: file.id,
              name: file.name,
              type: "file",
              path: file.path,
              content: file.content,
            });
          } else {
            // Add file to the found target directory
            if (!targetDirectory.children) {
              targetDirectory.children = [];
            }
            targetDirectory.children.push({
              id: file.id,
              name: file.name,
              type: "file",
              path: file.path,
              content: file.content,
            });
          }

          return {
            openFiles: newOpenFiles,
            activeFile: file,
            filesTree: updatedFilesTree,
          };
        });
      },

      addFolder: (folder: FolderItem) => {
        set((state) => {
          // Add folder to filesTree
          const updatedFilesTree = [...state.filesTree];

          // Extract the parent directory path from the folder's path
          const folderPath = folder.path;
          const lastSlashIndex = folderPath.lastIndexOf("/");
          const parentPath =
            lastSlashIndex > 0 ? folderPath.substring(0, lastSlashIndex) : "";

          // Find the target parent directory or use root if not found
          let parentDirectory = null;

          // Function to recursively find the directory by path
          const findDirectoryByPath = (items: any[], path: string): any => {
            for (const item of items) {
              if (item.type === "folder") {
                if (item.path === path) {
                  return item;
                }
                if (item.children) {
                  const found = findDirectoryByPath(item.children, path);
                  if (found) return found;
                }
              }
            }
            return null;
          };

          // Try to find the parent directory by path
          if (parentPath) {
            parentDirectory = findDirectoryByPath(updatedFilesTree, parentPath);
          }

          // Create the new folder object
          const newFolder = {
            id: folder.id,
            name: folder.name,
            type: "folder",
            path: folder.path,
            children: [],
          };

          // If no parent directory found, add to root
          if (!parentDirectory) {
            updatedFilesTree.push(newFolder);
          } else {
            // Add folder to the found parent directory
            if (!parentDirectory.children) {
              parentDirectory.children = [];
            }
            parentDirectory.children.push(newFolder);
          }

          return {
            filesTree: updatedFilesTree,
          };
        });
      },

      refreshExplorer: () => {
        // Force a re-render of the file explorer by creating a new reference
        // This ensures React detects the changes
        console.log("Refreshing explorer view");
        set((state) => {
          // Make a deep copy of the filesTree to ensure React detects changes
          const newFilesTree = JSON.parse(JSON.stringify(state.filesTree));
          return {
            filesTree: newFilesTree,
          };
        });
      },

      clearFilesTree: () => {
        set(() => ({
          filesTree: [],
          openFiles: [],
          activeFile: null,
        }));
      },
    }),
    {
      name: "game-code-forge-storage",
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        language: state.language,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);

// Helper hook for theme management
export const useTheme = () => {
  const { theme, setTheme, toggleTheme } = useAppStore();
  return { theme, setTheme, toggleTheme };
};
