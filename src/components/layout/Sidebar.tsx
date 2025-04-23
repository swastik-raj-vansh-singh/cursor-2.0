import { useState, useRef, useEffect } from "react";
import {
  Folder,
  FileCode,
  Play,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  RefreshCw,
  TerminalSquare,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore, FileItem as AppFileItem } from "@/store/useAppStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileSearchBar } from "./FileSearchBar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Utility: suggest code snippet based on filename extension
function getInitialContentByExtension(filename: string) {
  const ext = filename.split(".").pop() || "";
  switch (ext) {
    case "js":
      return `// ${filename}\n\n/**\n * Main function\n */\nfunction main() {\n  console.log("Hello from ${filename}!");\n}\n\nmain();`;
    case "html":
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${filename}</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>`;
    case "css":
      return `/* ${filename} */\n\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n  line-height: 1.6;\n}`;
    case "json":
      return `{\n  "name": "example",\n  "version": "1.0.0",\n  "description": "Example JSON file"\n}`;
    case "py":
      return `# ${filename}\n\ndef main():\n    print("Hello from ${filename}!")\n\nif __name__ == "__main__":\n    main()`;
    case "ts":
      return `// ${filename}\n\n/**\n * Main function\n */\nfunction main(): void {\n  console.log("Hello from ${filename}!");\n}\n\nmain();`;
    case "jsx":
    case "tsx":
      return `import React from 'react';\n\ninterface Props {\n  name?: string;\n}\n\nexport default function Component({ name = "World" }: Props) {\n  return (\n    <div>\n      <h1>Hello, {name}!</h1>\n    </div>\n  );\n}\n`;
    default:
      return `// New file: ${filename}\n`;
  }
}

// Using a local FileItem interface for the sidebar tree structure
interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileItem[];
  path?: string;
  content?: string;
}

export function Sidebar() {
  const {
    addFile,
    addFolder,
    refreshExplorer,
    setActiveFile,
    openFiles,
    toggleTerminal,
  } = useAppStore();
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(
    null
  );
  const filesFromState = useAppStore((state) => state.filesTree);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // State for create new file/folder dialogs
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  // State for rename and delete dialogs
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Add state for drag and drop operations
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState<boolean>(false);

  // Add state to track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  // Add click handler to clear selection when clicking empty space
  useEffect(() => {
    const handleBackgroundClick = (e: MouseEvent) => {
      // Only handle this if the click was directly on the sidebar background
      // and not on any of its children
      if (e.target === sidebarRef.current) {
        setSelectedDirectory(null);
      }
    };

    const sidebarElement = sidebarRef.current;
    if (sidebarElement) {
      sidebarElement.addEventListener("click", handleBackgroundClick);
    }

    return () => {
      if (sidebarElement) {
        sidebarElement.removeEventListener("click", handleBackgroundClick);
      }
    };
  }, []);

  // Directory resolution utility: find directory node by its ID
  function findDirectoryNodeById(
    tree: FileItem[],
    dirId: string
  ): FileItem | null {
    for (const node of tree) {
      if (node.id === dirId && node.type === "folder") return node;
      if (node.children) {
        const found = findDirectoryNodeById(node.children, dirId);
        if (found) return found;
      }
    }
    return null;
  }

  // Get file extension suggestions based on context
  function getFileExtensionSuggestions(): string[] {
    return [".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json", ".md"];
  }

  // Handle showing the new file dialog
  const handleShowNewFileDialog = () => {
    setNewFileName("");
    // We're no longer forcing a directory selection when none exists
    // If no directory is selected, the file will be created at the root
    setIsNewFileDialogOpen(true);
  };

  // Handle showing the new folder dialog
  const handleShowNewFolderDialog = () => {
    setNewFolderName("");
    // We're no longer forcing a directory selection when none exists
    // If no directory is selected, the folder will be created at the root
    setIsNewFolderDialogOpen(true);
  };

  // Create new file with name from dialog
  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return;

    let dirId = selectedDirectory;
    const parent = dirId ? findDirectoryNodeById(filesFromState, dirId) : null;

    // Generate file ID and path
    const fileId = `file-${Date.now()}`;
    const fileName = newFileName.includes(".")
      ? newFileName
      : `${newFileName}.js`;

    // Create proper path based on parent directory
    let filePath = fileName;
    if (parent && parent.path) {
      filePath = `${parent.path}/${fileName}`;
    }

    const content = getInitialContentByExtension(fileName);

    // Create a file item that matches the expected AppFileItem structure
    const appFileItem: AppFileItem = {
      id: fileId,
      name: fileName,
      path: filePath,
      content: content,
    };

    addFile(appFileItem);
    refreshExplorer();
    setActiveFile(appFileItem); // Auto-open the new file in the editor
    setIsNewFileDialogOpen(false);
  };

  // Create new folder with name from dialog
  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;

    const dirId = selectedDirectory;
    const parent = dirId ? findDirectoryNodeById(filesFromState, dirId) : null;

    const folderId = `folder-${Date.now()}`;

    // Create proper path based on parent directory
    let folderPath = newFolderName;
    if (parent && parent.path) {
      folderPath = `${parent.path}/${newFolderName}`;
    }

    addFolder({
      id: folderId,
      name: newFolderName,
      path: folderPath,
    });

    refreshExplorer();
    setIsNewFolderDialogOpen(false);
  };

  const handleSearchResultClick = (fileId: string, line?: number) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (file) setActiveFile(file);
  };

  // Handle rename functionality
  const handleShowRenameDialog = (item: FileItem) => {
    setItemToRename(item);
    setNewItemName(item.name);
    setIsRenameDialogOpen(true);
  };

  const handleRenameItem = () => {
    if (!itemToRename || !newItemName.trim()) return;

    // Create a deep copy of the filesTree
    const updatedFilesTree = JSON.parse(JSON.stringify(filesFromState));

    // Function to recursively find and rename the item
    const findAndRename = (items: FileItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemToRename.id) {
          // Handle extension preservation for files
          let newName = newItemName;
          if (items[i].type === "file" && itemToRename.name.includes(".")) {
            const oldExt = itemToRename.name.split(".").pop();
            if (!newName.includes(".")) {
              newName = `${newName}.${oldExt}`;
            }
          }

          // Update the item's name and path
          const oldPathParts = items[i].path?.split("/") || [];
          oldPathParts.pop(); // Remove the old name
          const newPath = [...oldPathParts, newName].filter(Boolean).join("/");

          items[i].name = newName;
          items[i].path = newPath;

          // If it's the active file, update it in the openFiles as well
          if (items[i].type === "file") {
            const openFileIndex = openFiles.findIndex(
              (f) => f.id === items[i].id
            );
            if (openFileIndex >= 0) {
              const updatedOpenFiles = [...openFiles];
              updatedOpenFiles[openFileIndex] = {
                ...updatedOpenFiles[openFileIndex],
                name: newName,
                path: newPath,
              };
              const storeInstance = useAppStore.getState();
              storeInstance.openFiles = updatedOpenFiles;
              refreshExplorer();

              // If it's the active file, update that too
              const activeFile = useAppStore.getState().activeFile;
              if (activeFile && activeFile.id === items[i].id) {
                storeInstance.activeFile = {
                  ...activeFile,
                  name: newName,
                  path: newPath,
                };
              }
            }
          }

          return true;
        }

        // Check children if this is a folder
        if (items[i].children && items[i].children.length > 0) {
          if (findAndRename(items[i].children)) {
            return true;
          }
        }
      }

      return false;
    };

    findAndRename(updatedFilesTree);

    // Update the store with the modified tree
    const storeInstance = useAppStore.getState();
    storeInstance.filesTree = updatedFilesTree;
    refreshExplorer();
    setIsRenameDialogOpen(false);
    setItemToRename(null);
  };

  // Handle delete functionality
  const handleShowDeleteConfirm = (item: FileItem) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    // Create a deep copy of the filesTree
    const updatedFilesTree = JSON.parse(JSON.stringify(filesFromState));

    // Function to recursively find and delete the item
    const findAndDelete = (items: FileItem[], parent?: FileItem): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemToDelete.id) {
          // Remove the item from the array
          items.splice(i, 1);

          // If it's a file, remove from openFiles if needed
          if (itemToDelete.type === "file") {
            useAppStore.getState().closeFile(itemToDelete.id);
          }

          return true;
        }

        // Check children if this is a folder
        if (items[i].children && items[i].children.length > 0) {
          if (findAndDelete(items[i].children, items[i])) {
            return true;
          }
        }
      }

      return false;
    };

    findAndDelete(updatedFilesTree);

    // Update the store with the modified tree
    const storeInstance = useAppStore.getState();
    storeInstance.filesTree = updatedFilesTree;
    refreshExplorer();

    setTimeout(() => {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
      setItemToDelete(null);
    }, 500);
  };

  // Set up event handlers for rename, delete, and welcome screen actions
  useEffect(() => {
    // Define event handlers
    const handleRenameRequest = (event: CustomEvent) => {
      if (event.detail) {
        handleShowRenameDialog(event.detail);
      }
    };

    const handleDeleteRequest = (event: CustomEvent) => {
      if (event.detail) {
        handleShowDeleteConfirm(event.detail);
      }
    };

    const handleCreateFileRequest = () => {
      handleShowNewFileDialog();
    };

    const handleCreateFolderRequest = () => {
      handleShowNewFolderDialog();
    };

    // Add event listeners
    window.addEventListener("file:rename-request" as any, handleRenameRequest);
    window.addEventListener("file:delete-request" as any, handleDeleteRequest);
    window.addEventListener(
      "sidebar:create-file" as any,
      handleCreateFileRequest
    );
    window.addEventListener(
      "sidebar:create-folder" as any,
      handleCreateFolderRequest
    );

    // Clean up
    return () => {
      window.removeEventListener(
        "file:rename-request" as any,
        handleRenameRequest
      );
      window.removeEventListener(
        "file:delete-request" as any,
        handleDeleteRequest
      );
      window.removeEventListener(
        "sidebar:create-file" as any,
        handleCreateFileRequest
      );
      window.removeEventListener(
        "sidebar:create-folder" as any,
        handleCreateFolderRequest
      );
    };
  }, []);

  // Function to move items between directories
  const moveItem = (itemToMove: FileItem, targetDirId: string | null) => {
    // Create a deep copy of the filesTree
    const updatedFilesTree = JSON.parse(JSON.stringify(filesFromState));

    // First, find and remove the item from its current location
    const removeItem = (items: FileItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemToMove.id) {
          // Found the item, remove it from this array
          items.splice(i, 1);
          return true;
        }

        // Check in children if this is a folder
        if (items[i].children && items[i].children.length > 0) {
          if (removeItem(items[i].children)) {
            return true;
          }
        }
      }

      return false;
    };

    // Find the target directory to add the item to
    const addItemToTarget = (
      items: FileItem[],
      targetId: string | null
    ): boolean => {
      // If targetId is null, add to root level
      if (targetId === null) {
        updatedFilesTree.push(itemToMove);
        return true;
      }

      // Otherwise search for the target directory
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === targetId && items[i].type === "folder") {
          // Initialize children array if it doesn't exist
          if (!items[i].children) {
            items[i].children = [];
          }

          // Add the item to this folder
          items[i].children.push(itemToMove);
          return true;
        }

        // Check in children recursively
        if (items[i].children && items[i].children.length > 0) {
          if (addItemToTarget(items[i].children, targetId)) {
            return true;
          }
        }
      }

      return false;
    };

    // First remove the item from its current location
    removeItem(updatedFilesTree);

    // Then add it to the target location
    if (targetDirId === null) {
      // Add to root
      updatedFilesTree.push(itemToMove);
    } else {
      // Add to target folder
      addItemToTarget(updatedFilesTree, targetDirId);
    }

    // Update path for the moved item and its children if it's a folder
    const updatePaths = (item: FileItem, parentPath: string = "") => {
      const newPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      item.path = newPath;

      // If it's a folder, update paths for all children
      if (item.type === "folder" && item.children) {
        for (const child of item.children) {
          updatePaths(child, newPath);
        }
      }

      // If it's a file and it's open, update its path in openFiles
      if (item.type === "file") {
        const openFileIndex = openFiles.findIndex((f) => f.id === item.id);
        if (openFileIndex >= 0) {
          const updatedOpenFiles = [...openFiles];
          updatedOpenFiles[openFileIndex] = {
            ...updatedOpenFiles[openFileIndex],
            path: newPath,
          };
          const storeInstance = useAppStore.getState();
          storeInstance.openFiles = updatedOpenFiles;

          // Update active file if needed
          if (
            storeInstance.activeFile &&
            storeInstance.activeFile.id === item.id
          ) {
            storeInstance.activeFile = {
              ...storeInstance.activeFile,
              path: newPath,
            };
          }
        }
      }
    };

    // Update the paths for the moved item (and its children if it's a folder)
    if (targetDirId === null) {
      // Item was moved to root
      updatePaths(itemToMove);
    } else {
      // Item was moved to a folder, get the parent path
      const getParentPath = (items: FileItem[], id: string): string | null => {
        for (const item of items) {
          if (item.id === id) {
            return item.path || item.name;
          }

          if (item.children && item.children.length > 0) {
            const path = getParentPath(item.children, id);
            if (path) return path;
          }
        }

        return null;
      };

      const parentPath = getParentPath(updatedFilesTree, targetDirId) || "";
      updatePaths(itemToMove, parentPath);
    }

    // Update the store and refresh the explorer
    const storeInstance = useAppStore.getState();
    storeInstance.filesTree = updatedFilesTree;
    refreshExplorer();

    // Clear drag states
    setDraggedItem(null);
    setDragOverItem(null);
    setDragOverRoot(false);

    toast.success(
      `Moved ${itemToMove.name} to ${targetDirId ? "folder" : "root directory"}`
    );
  };

  // Enhanced refresh explorer function
  const handleRefreshExplorer = () => {
    // Collapse all folders by clearing the expanded folders set
    setExpandedFolders(new Set());
    // Clear any selection
    setSelectedDirectory(null);
    // Call the original refresh function
    refreshExplorer();
    // Show feedback to user
    toast.success("Explorer refreshed");
  };

  // Function to toggle folder expansion state
  const toggleFolderExpanded = (folderId: string, isExpanded: boolean) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(folderId);
      } else {
        newSet.delete(folderId);
      }
      return newSet;
    });
  };

  // Function to check if a folder is expanded
  const isFolderExpanded = (folderId: string) => {
    return expandedFolders.has(folderId);
  };

  return (
    <div
      className="h-full flex flex-col w-full"
      data-sidebar-handle-rename={handleShowRenameDialog}
      data-sidebar-handle-delete={handleShowDeleteConfirm}
      ref={sidebarRef}
      onDragOver={(e) => {
        e.preventDefault();
        // If dragging over the sidebar background (not a specific file/folder)
        if (e.target === sidebarRef.current) {
          setDragOverRoot(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.target === sidebarRef.current) {
          setDragOverRoot(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        // If dropping on the sidebar background (root level)
        if (draggedItem && (e.target === sidebarRef.current || dragOverRoot)) {
          moveItem(draggedItem, null); // Move to root
        }
      }}
    >
      {/* Search bar at the top */}
      <FileSearchBar onResultClick={handleSearchResultClick} />
      <div className="p-2 border-b border-sidebar-border font-medium text-sm flex items-center justify-between">
        <span>EXPLORER</span>

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleShowNewFileDialog}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New File</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleShowNewFolderDialog}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Folder</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRefreshExplorer}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh Explorer</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <FileTree
            items={filesFromState || []}
            onSelectDirectory={setSelectedDirectory}
            onSelectFile={(file) =>
              setActiveFile({
                ...file,
                path: file.path || "",
                content: file.content || "",
              })
            }
            selectedDirectory={selectedDirectory}
            draggedItem={draggedItem}
            setDraggedItem={setDraggedItem}
            dragOverItem={dragOverItem}
            setDragOverItem={setDragOverItem}
            onMoveItem={moveItem}
            expandedFolders={expandedFolders}
            toggleFolderExpanded={toggleFolderExpanded}
          />
        </div>

        {/* Drop indicator for root level */}
        {dragOverRoot && (
          <div className="border-2 border-primary mx-2 mb-2 mt-0 h-2 rounded-full animate-pulse"></div>
        )}
      </ScrollArea>

      <div className="p-2 border-t border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-sidebar-foreground hover:text-sidebar-primary-foreground"
                onClick={toggleTerminal}
              >
                <TerminalSquare className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Toggle Terminal</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-sidebar-foreground hover:text-sidebar-primary-foreground">
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-sidebar-foreground hover:text-sidebar-primary-foreground">
                <Play className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Run</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-sidebar-foreground hover:text-sidebar-primary-foreground">
                <FileCode className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Extensions</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* New File Dialog */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="filename"
                  placeholder="Enter file name"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  autoFocus
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Common extensions:
                  {getFileExtensionSuggestions().map((ext, i) => (
                    <button
                      key={ext}
                      className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        // If name has no extension, add it; otherwise replace it
                        const baseName = newFileName.includes(".")
                          ? newFileName.substring(
                              0,
                              newFileName.lastIndexOf(".")
                            )
                          : newFileName;
                        setNewFileName(baseName + ext);
                      }}
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-sm">
                {selectedDirectory ? (
                  <span>
                    Creating inside folder:{" "}
                    <strong>
                      {findDirectoryNodeById(filesFromState, selectedDirectory)
                        ?.name || "selected folder"}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Creating at workspace root level (no folder selected)
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewFileDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateNewFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="foldername"
                  placeholder="Enter folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="text-sm">
                {selectedDirectory ? (
                  <span>
                    Creating inside folder:{" "}
                    <strong>
                      {findDirectoryNodeById(filesFromState, selectedDirectory)
                        ?.name || "selected folder"}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Creating at workspace root level (no folder selected)
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewFolderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateNewFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename {itemToRename?.type}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="rename"
                  placeholder={`Enter new ${itemToRename?.type} name`}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {itemToRename?.type === "file" &&
                  itemToRename?.name.includes(".") &&
                  !newItemName.includes(".") && (
                    <span>
                      Extension will be preserved from the original file.
                    </span>
                  )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameItem}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete {itemToDelete?.type}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{itemToDelete?.name}</span>?
                {itemToDelete?.type === "folder" &&
                  " All content will be permanently deleted."}
              </p>
              <p className="text-sm text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteItem}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FileTreeProps {
  items: FileItem[];
  level?: number;
  onSelectDirectory?: (path: string | null) => void;
  onSelectFile?: (file: FileItem) => void;
  selectedDirectory?: string | null;
  draggedItem?: FileItem | null;
  setDraggedItem?: (item: FileItem | null) => void;
  dragOverItem?: string | null;
  setDragOverItem?: (id: string | null) => void;
  onMoveItem?: (item: FileItem, targetId: string | null) => void;
  expandedFolders: Set<string>;
  toggleFolderExpanded: (folderId: string, isExpanded: boolean) => void;
}

function FileTree({
  items,
  level = 0,
  onSelectDirectory,
  onSelectFile,
  selectedDirectory,
  draggedItem,
  setDraggedItem,
  dragOverItem,
  setDragOverItem,
  onMoveItem,
  expandedFolders,
  toggleFolderExpanded,
}: FileTreeProps) {
  // Handle clicks on the empty space of the FileTree to deselect folders
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on the ul element (not on its children)
    if (e.target === e.currentTarget) {
      onSelectDirectory?.(null);
    }
  };

  return (
    <ul className={`${level > 0 ? "pl-4" : ""}`} onClick={handleContainerClick}>
      {items.map((item) => (
        <FileTreeItem
          key={item.id}
          item={item}
          level={level}
          onSelectDirectory={onSelectDirectory}
          onSelectFile={onSelectFile}
          selectedDirectory={selectedDirectory}
          draggedItem={draggedItem}
          setDraggedItem={setDraggedItem}
          dragOverItem={dragOverItem}
          setDragOverItem={setDragOverItem}
          onMoveItem={onMoveItem}
          expandedFolders={expandedFolders}
          toggleFolderExpanded={toggleFolderExpanded}
        />
      ))}
    </ul>
  );
}

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  onSelectDirectory?: (path: string | null) => void;
  onSelectFile?: (file: FileItem) => void;
  selectedDirectory?: string | null;
  draggedItem?: FileItem | null;
  setDraggedItem?: (item: FileItem | null) => void;
  dragOverItem?: string | null;
  setDragOverItem?: (id: string | null) => void;
  onMoveItem?: (item: FileItem, targetId: string | null) => void;
  expandedFolders: Set<string>;
  toggleFolderExpanded: (folderId: string, isExpanded: boolean) => void;
}

function FileTreeItem({
  item,
  level,
  onSelectDirectory,
  onSelectFile,
  selectedDirectory,
  draggedItem,
  setDraggedItem,
  dragOverItem,
  setDragOverItem,
  onMoveItem,
  expandedFolders,
  toggleFolderExpanded,
}: FileTreeItemProps) {
  // Use expandedFolders state to determine if this folder is open
  const isOpen = item.type === "folder" && expandedFolders.has(item.id);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const isSelected = item.type === "folder" && selectedDirectory === item.id;

  // Determine if this item is being dragged or is a drop target
  const isDragging = draggedItem?.id === item.id;
  const isDropTarget = dragOverItem === item.id;
  // Prevent dropping an item onto itself or into its own child (for folders)
  const isValidDropTarget =
    item.type === "folder" &&
    draggedItem?.id !== item.id &&
    !isChildOf(draggedItem, item.id);

  // Utility function to check if an item is a child of another item
  function isChildOf(
    potentialChild: FileItem | null,
    parentId: string
  ): boolean {
    if (
      !potentialChild ||
      potentialChild.type !== "folder" ||
      !potentialChild.children
    ) {
      return false;
    }

    // Check if any direct child has the parentId
    for (const child of potentialChild.children) {
      if (child.id === parentId) {
        return true;
      }

      // Recursively check if any of the children's children have the parentId
      if (child.type === "folder" && isChildOf(child, parentId)) {
        return true;
      }
    }

    return false;
  }

  // Updated toggle function that uses the passed toggleFolderExpanded
  const toggleOpen = () => {
    if (item.type === "folder") {
      // Toggle folder expansion
      toggleFolderExpanded(item.id, !isOpen);

      // Toggle folder selection - if this folder is already selected, deselect it
      if (selectedDirectory === item.id) {
        onSelectDirectory?.(null);
      } else {
        onSelectDirectory?.(item.id);
      }
    }
  };

  // Enhance the visual indicator for selected state
  const selectedStyles = isSelected
    ? "bg-sidebar-accent font-medium border-l-2 border-sidebar-primary"
    : "";

  // Add styles for drag and drop interactions
  const dragStyles = isDragging ? "opacity-50" : "";
  const dropTargetStyles =
    isDropTarget && isValidDropTarget
      ? "bg-primary/10 border border-primary rounded-sm"
      : "";

  const handleFileClick = () => {
    if (item.type === "file" && onSelectFile) {
      onSelectFile(item);
    }
  };

  // Handle context menu actions
  const handleRename = () => {
    // Dispatch an event with the item to rename
    window.dispatchEvent(
      new CustomEvent("file:rename-request", { detail: item })
    );
    setIsContextMenuOpen(false);
  };

  const handleDelete = () => {
    // Dispatch an event with the item to delete
    window.dispatchEvent(
      new CustomEvent("file:delete-request", { detail: item })
    );
    setIsContextMenuOpen(false);
  };

  // Get icon based on file type/extension
  const getFileIcon = () => {
    if (item.type === "folder") {
      return <Folder className="h-4 w-4 mr-1.5" />;
    }

    // Determine icon based on extension
    const ext = item.name.split(".").pop()?.toLowerCase() || "";

    switch (ext) {
      case "js":
        return <FileCode className="h-4 w-4 mr-1.5 text-yellow-500" />;
      case "ts":
        return <FileCode className="h-4 w-4 mr-1.5 text-blue-500" />;
      case "jsx":
      case "tsx":
        return <FileCode className="h-4 w-4 mr-1.5 text-cyan-500" />;
      case "css":
        return <FileCode className="h-4 w-4 mr-1.5 text-purple-500" />;
      case "html":
        return <FileCode className="h-4 w-4 mr-1.5 text-orange-500" />;
      case "json":
        return <FileCode className="h-4 w-4 mr-1.5 text-green-500" />;
      case "md":
        return <FileText className="h-4 w-4 mr-1.5 text-blue-400" />;
      default:
        return <FileCode className="h-4 w-4 mr-1.5" />;
    }
  };

  return (
    <li className="my-1">
      <div
        className={`flex items-center justify-between group ${dropTargetStyles}`}
        draggable={true}
        onDragStart={(e) => {
          // Start dragging this item
          if (setDraggedItem) setDraggedItem(item);
          // Store the item ID in the drag event data
          e.dataTransfer.setData("text/plain", item.id);
          // Set the drag effect
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          // Clear drag state
          if (setDraggedItem) setDraggedItem(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Only allow dropping on folders (and not on the item being dragged)
          if (
            item.type === "folder" &&
            draggedItem?.id !== item.id &&
            isValidDropTarget
          ) {
            e.dataTransfer.dropEffect = "move";
            if (setDragOverItem) setDragOverItem(item.id);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Clear drop target when dragging out
          if (dragOverItem === item.id && setDragOverItem) {
            setDragOverItem(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();

          // Handle drop only if this is a folder and we have valid items to move
          if (
            item.type === "folder" &&
            draggedItem &&
            onMoveItem &&
            isValidDropTarget
          ) {
            onMoveItem(draggedItem, item.id);
          }
        }}
      >
        <div
          className={`flex items-center py-1 px-1 text-sm rounded-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer flex-1 ${selectedStyles} ${dragStyles}`}
          onClick={item.type === "folder" ? toggleOpen : handleFileClick}
        >
          {item.type === "folder" &&
            (isOpen ? (
              <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
            ))}

          {getFileIcon()}

          <span
            className="truncate"
            title={
              item.type === "folder"
                ? "Click to select/deselect this folder"
                : item.name
            }
          >
            {item.name}
            {item.type === "folder" && isSelected && (
              <span className="ml-1 text-xs opacity-70">(selected)</span>
            )}
          </span>
        </div>

        <DropdownMenu
          open={isContextMenuOpen}
          onOpenChange={setIsContextMenuOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleRename}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Show drop indicator when hovering over a folder */}
      {isDropTarget && isValidDropTarget && (
        <div className="h-1 bg-primary my-1 rounded-full mx-2 animate-pulse"></div>
      )}

      {item.type === "folder" && isOpen && item.children && (
        <FileTree
          items={item.children}
          level={level + 1}
          onSelectDirectory={onSelectDirectory}
          onSelectFile={onSelectFile}
          selectedDirectory={selectedDirectory}
          draggedItem={draggedItem}
          setDraggedItem={setDraggedItem}
          dragOverItem={dragOverItem}
          setDragOverItem={setDragOverItem}
          onMoveItem={onMoveItem}
          expandedFolders={expandedFolders}
          toggleFolderExpanded={toggleFolderExpanded}
        />
      )}
    </li>
  );
}
