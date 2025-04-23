import React from "react";
import { Button } from "@/components/ui/button";
import { Folder, Plus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function WelcomeScreen() {
  const { toggleCommandPalette } = useAppStore();
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] =
    React.useState(false);

  // Send custom event to trigger the file/folder creation dialogs in the Sidebar
  const handleCreateNewFile = () => {
    window.dispatchEvent(new CustomEvent("sidebar:create-file"));
  };

  const handleCreateNewFolder = () => {
    window.dispatchEvent(new CustomEvent("sidebar:create-folder"));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome to Game Code Forge
          </h2>
          <p className="text-muted-foreground">
            Start coding by creating a new file
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleCreateNewFile}
            className="flex items-center justify-center gap-2 h-24"
            variant="outline"
          >
            <Plus className="h-5 w-5" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Create New File</span>
              <span className="text-xs text-muted-foreground text-left">
                Add a new file to your project
              </span>
            </div>
          </Button>

          <Button
            onClick={handleCreateNewFolder}
            className="flex items-center justify-center gap-2 h-24"
            variant="outline"
          >
            <Folder className="h-5 w-5" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Create New Folder</span>
              <span className="text-xs text-muted-foreground text-left">
                Organize your files in folders
              </span>
            </div>
          </Button>
        </div>

        <div className="pt-4">
          <Button
            variant="ghost"
            onClick={toggleCommandPalette}
            className="text-sm text-muted-foreground"
          >
            Press <kbd className="mx-1 px-2 py-0.5 bg-muted rounded">Ctrl</kbd>+
            <kbd className="mx-1 px-2 py-0.5 bg-muted rounded">K</kbd> for
            command palette
          </Button>
        </div>
      </div>
    </div>
  );
}
