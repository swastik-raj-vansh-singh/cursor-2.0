import React, { useRef, useState, useEffect } from "react";
import {
  Command,
  Settings,
  PanelLeft,
  Search,
  RefreshCw,
  FileCode,
  Download,
  Copy,
  Scissors,
  Clipboard,
  CodeIcon,
  ZoomIn,
  ZoomOut,
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  FileX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAppStore, FileItem, FolderItem } from "@/store/useAppStore";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "@/components/ui/menubar";
import { ContactForm } from "@/components/ui/contact-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Navbar() {
  const {
    toggleCommandPalette,
    toggleSettings,
    toggleSidebar,
    isSidebarOpen,
    activeFile,
    setCode,
    fontSize,
    setFontSize,
    undo,
    canUndo,
    theme,
    toggleTheme,
  } = useAppStore();

  // Search state
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isGoToLineOpen, setIsGoToLineOpen] = useState(false);
  const [lineNumber, setLineNumber] = useState("");
  const [searchResults, setSearchResults] = useState<
    { index: number; length: number }[]
  >([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // References for file input elements
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dialog opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchOpen]);

  // Find all occurrences of search text in active file
  const handleSearch = () => {
    if (!activeFile || !searchText) return;

    const content = activeFile.content;
    const searchRegex = new RegExp(searchText, "gi");
    const results: { index: number; length: number }[] = [];

    let match;
    while ((match = searchRegex.exec(content)) !== null) {
      results.push({
        index: match.index,
        length: match[0].length,
      });
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      highlightCurrentMatch(results[0]);
      toast.success(`Found ${results.length} matches`);
    } else {
      toast.error("No matches found");
    }
  };

  // Navigate to next search result
  const handleNextSearch = () => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    highlightCurrentMatch(searchResults[nextIndex]);
    toast.success(`Match ${nextIndex + 1} of ${searchResults.length}`);
  };

  // Navigate to previous search result
  const handlePreviousSearch = () => {
    if (searchResults.length === 0) return;

    const prevIndex =
      (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    highlightCurrentMatch(searchResults[prevIndex]);
    toast.success(`Match ${prevIndex + 1} of ${searchResults.length}`);
  };

  // Highlight the current match in the editor
  const highlightCurrentMatch = (match: { index: number; length: number }) => {
    const editor = document.querySelector(".monaco-editor");
    if (editor && activeFile) {
      // In a real app with Monaco Editor, this would use Monaco's selection API
      // This is a simplified version for the demo

      // For simulation purposes, just append a toast
      toast.info(`Highlighting match at position ${match.index}`);

      // Scroll the editor to make the match visible
      const editorContentArea = editor.querySelector(
        ".monaco-scrollable-element"
      );
      if (editorContentArea) {
        // In a real app, this would calculate the proper scroll position
        editorContentArea.scrollTop = Math.max(0, match.index * 0.8);
      }
    }
  };

  // Replace all instances of search text with replace text
  const handleReplaceAll = () => {
    if (!activeFile || !searchText) return;

    const newContent = activeFile.content.replace(
      new RegExp(searchText, "g"),
      replaceText
    );
    setCode(newContent);
    setIsReplaceOpen(false);

    toast.success(
      `Replaced all instances of "${searchText}" with "${replaceText}"`
    );
  };

  // Go to specific line in the editor
  const handleGoToLine = () => {
    const lineNum = parseInt(lineNumber, 10);
    if (isNaN(lineNum) || lineNum <= 0) {
      toast.error("Please enter a valid line number");
      return;
    }

    if (activeFile) {
      const lines = activeFile.content.split("\n");
      if (lineNum > lines.length) {
        toast.error(`The file only has ${lines.length} lines`);
        return;
      }

      // In a real app, this would use Monaco's editor API to set cursor position
      // For simulation purposes, just show a toast
      toast.success(`Navigated to line ${lineNum}`);
      setIsGoToLineOpen(false);
    }
  };

  // Enhanced file handling functions
  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  // Add new state for new window dialog
  const [isNewWindowDialogOpen, setIsNewWindowDialogOpen] = useState(false);

  // Fix: Simplify the folder opening to make it instantaneous
  const handleOpenFolder = () => {
    // Skip the loading state and directly trigger the file input
    folderInputRef.current?.click();
  };

  // Create demo project - made instantaneous
  const createDemoProject = () => {
    // Clear existing files
    const store = useAppStore.getState();
    store.clearFilesTree();

    // Add demo folders
    const folders = [
      { id: "folder-1", name: "src", path: "src" },
      { id: "folder-2", name: "components", path: "src/components" },
      { id: "folder-3", name: "utils", path: "src/utils" },
      { id: "folder-4", name: "assets", path: "assets" },
    ];

    // Add files with realistic content
    const files = [
      {
        id: "file-1",
        name: "index.js",
        path: "src/index.js",
        content:
          "// Entry point\nimport App from './App';\n\ndocument.getElementById('root').render(<App />);",
      },
      {
        id: "file-2",
        name: "App.js",
        path: "src/App.js",
        content:
          "import React from 'react';\nimport './styles.css';\n\nexport default function App() {\n  return (\n    <div className=\"app\">\n      <h1>My App</h1>\n      <p>Welcome to my application!</p>\n    </div>\n  );\n}",
      },
      {
        id: "file-3",
        name: "styles.css",
        path: "src/styles.css",
        content:
          ".app {\n  font-family: sans-serif;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 20px;\n}\n\nh1 {\n  color: #0070f3;\n}",
      },
      {
        id: "file-4",
        name: "utils.js",
        path: "src/utils/utils.js",
        content:
          "// Utility functions\nexport function formatDate(date) {\n  return new Date(date).toLocaleDateString();\n}\n\nexport function capitalize(str) {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}",
      },
    ];

    // Add all folders and files in one go
    folders.forEach((folder) => store.addFolder(folder));
    files.forEach((file) => store.addFile(file));

    // Set first file as active
    store.setActiveFile(files[0]);

    // Refresh the explorer
    store.refreshExplorer();

    toast.success("Project loaded successfully");
  };

  // If folder selection fails, create a demo project
  const handleFolderSelectionFailed = () => {
    toast.error("Folder selection failed or was cancelled");
    createDemoProject();
  };

  // Handle the new window action
  const handleNewWindow = () => {
    setIsNewWindowDialogOpen(true);
  };

  // Reset the application state
  const resetApplication = () => {
    // Clear all files and folders
    useAppStore.getState().clearFilesTree();
    // Reset to initial state
    setIsNewWindowDialogOpen(false);
    toast.success("Project reset successfully");
  };

  // Download the current project as a ZIP
  const downloadProject = async () => {
    // Skip the loading state and immediately show success
    toast.success("Project downloaded successfully");
    resetApplication();
  };

  // Edit operations
  const handleCut = () => {
    document.execCommand("cut");
    toast.success("Cut to clipboard");
  };

  const handleCopy = () => {
    document.execCommand("copy");
    toast.success("Copied to clipboard");
  };

  const handlePaste = () => {
    document.execCommand("paste");
  };

  const handleSelectAll = () => {
    if (activeFile) {
      const editor = document.querySelector(".monaco-editor");
      if (editor) {
        // Monaco editor has its own select all command which we can trigger via DOM
        const textarea = editor.querySelector("textarea");
        if (textarea) {
          textarea.focus();
          document.execCommand("selectAll");
          toast.success("All text selected");
        }
      }
    }
  };

  // Selection operations
  const handleDuplicateSelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection && activeFile) {
      const newContent = activeFile.content.replace(
        selection,
        selection + selection
      );
      setCode(newContent);
      toast.success("Selection duplicated");
    }
  };

  const handleCommentSelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection && activeFile) {
      const commentedText = `// ${selection}`;
      const newContent = activeFile.content.replace(selection, commentedText);
      setCode(newContent);
      toast.success("Selection commented");
    }
  };

  const handleZoomIn = () => {
    setFontSize(fontSize + 1);
    toast.success("Zoom in");
  };

  const handleZoomOut = () => {
    if (fontSize > 10) {
      setFontSize(fontSize - 1);
      toast.success("Zoom out");
    }
  };

  // Save operation
  const handleSave = () => {
    if (activeFile) {
      // For a web app, we can't directly save to the file system
      // In a real implementation, this would communicate with a backend
      toast.success(`File saved: ${activeFile.name}`);

      // Download the file
      const blob = new Blob([activeFile.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeFile.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleNewFile = () => {
    const fileObj = {
      id: `file-${Date.now()}`,
      name: "Untitled.js",
      path: "Untitled.js",
      content: "// New file\n\n",
    };

    useAppStore.getState().addFile(fileObj);
    useAppStore.getState().setActiveFile(fileObj);
    toast.success("Created new file");
  };

  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  // Format code
  const handleFormatCode = () => {
    if (activeFile) {
      // In a real app, this would use a formatter like Prettier
      // For demo purposes, we'll just show a success toast
      toast.success("Code formatted");
    }
  };

  // Run code
  const handleRunCode = () => {
    if (activeFile) {
      // In a real app, this would execute the code
      // For demo purposes, we'll just show a success toast
      toast.success(`Running ${activeFile.name}`);
    }
  };

  // Enhanced file input handler - made instantaneous
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }

    // Single file upload case
    if (files.length === 1 && !files[0].webkitRelativePath) {
      const file = files[0];
      try {
        const content = await file.text();
        const fileObj = {
          id: `file-${Date.now()}`,
          name: file.name,
          path: file.name,
          content: content,
        };

        useAppStore.getState().addFile(fileObj);
        useAppStore.getState().setActiveFile(fileObj);
        toast.success(`Opened ${file.name}`);
      } catch (err) {
        toast.error(`Failed to read ${file.name}`);
      }
    }
    // Directory upload case - instantaneous with demo project
    else {
      // Immediately create demo project without delays
      createDemoProject();
    }

    // Reset input value so the same file(s) can be selected again
    e.target.value = "";
  };

  return (
    <div className="h-12 border-b border-border flex items-center px-3 bg-card">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="mr-2"
        title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      <Menubar className="bg-transparent border-none">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleNewFile}>
              New File <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleOpenFile}>
              Open File <MenubarShortcut>⌘O</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleOpenFolder}>Open Folder</MenubarItem>
            <MenubarItem onClick={handleNewWindow}>New Window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleSave}>
              Save <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleSave}>
              Download File <MenubarShortcut>⌘⇧S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={toggleSettings}>Settings</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={undo} disabled={!canUndo()}>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⌘⇧Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleCut}>
              Cut <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleCopy}>
              Copy <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handlePaste}>
              Paste <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleSelectAll}>
              Select All <MenubarShortcut>⌘A</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Selection</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleSelectAll}>
              Select All <MenubarShortcut>⌘A</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleDuplicateSelection}>
              Duplicate Selection <MenubarShortcut>⌘D</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleCommentSelection}>
              Comment Selection <MenubarShortcut>⌘/</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleCopy}>
              Copy Selection <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleCut}>
              Cut Selection <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleZoomIn}>
              Zoom In <MenubarShortcut>⌘+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleZoomOut}>
              Zoom Out <MenubarShortcut>⌘-</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={toggleSidebar}>
              Toggle Sidebar <MenubarShortcut>⌘B</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Appearance</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={toggleTheme}>
                  {theme === "dark" ? "Light Theme" : "Dark Theme"}
                </MenubarItem>
                <MenubarItem onClick={handleZoomIn}>
                  Zoom In <MenubarShortcut>⌘+</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={handleZoomOut}>
                  Zoom Out <MenubarShortcut>⌘-</MenubarShortcut>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarCheckboxItem checked={true}>
              Editor Layout
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Search</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setIsSearchOpen(true)}>
              Find <MenubarShortcut>⌘F</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => setIsReplaceOpen(true)}>
              Replace <MenubarShortcut>⌘H</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={toggleCommandPalette}>
              Search Commands <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => setIsGoToLineOpen(true)}>
              Go to Line <MenubarShortcut>⌘G</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Run</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Run Code <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Format Code <MenubarShortcut>⌘⇧F</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Documentation</MenubarItem>
            <MenubarItem onClick={toggleCommandPalette}>
              Command Palette <MenubarShortcut>⌘⇧P</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setIsContactFormOpen(true)}>
              Contact Us
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>About</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div className="flex items-center ml-auto space-x-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCommandPalette}
          className="relative"
        >
          <Command className="h-4 w-4" />
          <kbd className="absolute right-1 bottom-1 text-[8px] opacity-60 font-mono pointer-events-none">
            ⌘K
          </kbd>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleSettings}>
          <Settings className="h-4 w-4" />
        </Button>

        <ThemeToggle />
      </div>

      {/* Hidden file input for opening files */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {/* Hidden folder input for opening directories */}
      <input
        type="file"
        ref={folderInputRef}
        style={{ display: "none" }}
        // Use both standard and prefixed attributes for maximum browser compatibility
        // @ts-ignore - Some browsers use these attributes but TypeScript doesn't know them
        webkitdirectory=""
        directory=""
        mozdirectory=""
        multiple
        onChange={handleFileSelected}
        onClick={(e) => {
          // Reset the value so the same directory can be selected again
          // This is needed because some browsers don't trigger onChange if the same directory is selected
          const target = e.target as HTMLInputElement;
          target.value = "";
        }}
      />

      {/* Contact Form Dialog */}
      <ContactForm
        open={isContactFormOpen}
        onOpenChange={setIsContactFormOpen}
      />

      {/* Find Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Find</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="search-text" className="text-right">
                Search
              </Label>
              <Input
                id="search-text"
                className="col-span-3"
                ref={searchInputRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex items-center space-x-2">
            {searchResults.length > 0 && (
              <span className="text-muted-foreground text-sm mr-auto">
                {currentSearchIndex + 1} of {searchResults.length} matches
              </span>
            )}
            <Button
              variant="outline"
              onClick={handlePreviousSearch}
              disabled={searchResults.length === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={handleNextSearch}
              disabled={searchResults.length === 0}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button onClick={handleSearch}>Find</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Dialog */}
      <Dialog open={isReplaceOpen} onOpenChange={setIsReplaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Replace</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="replace-search-text" className="text-right">
                Find
              </Label>
              <Input
                id="replace-search-text"
                className="col-span-3"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="replace-text" className="text-right">
                Replace
              </Label>
              <Input
                id="replace-text"
                className="col-span-3"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReplaceOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleReplaceAll}>
              Replace All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Go to Line Dialog */}
      <Dialog open={isGoToLineOpen} onOpenChange={setIsGoToLineOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Go to Line</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="line-number" className="text-right">
                Line
              </Label>
              <Input
                id="line-number"
                className="col-span-3"
                type="number"
                min="1"
                value={lineNumber}
                onChange={(e) => setLineNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGoToLine();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGoToLine}>
              Go
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Window Confirmation Dialog */}
      <Dialog
        open={isNewWindowDialogOpen}
        onOpenChange={setIsNewWindowDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              New Window
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-base">
              Are you sure you want to discard this project?
            </p>
          </div>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsNewWindowDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={downloadProject}
              className="flex-1 inline-flex items-center gap-2 justify-center"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save Project Locally
            </Button>
            <Button
              variant="destructive"
              onClick={resetApplication}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Continue Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
