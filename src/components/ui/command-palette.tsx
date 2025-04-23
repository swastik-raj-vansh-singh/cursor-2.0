import React, { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Settings,
  CheckSquare,
  RotateCcw,
  HelpCircle,
  Search,
  Zap,
  Key,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

type CommandType = {
  id: string;
  name: string;
  shortcut?: string[];
  icon: React.ReactNode;
  action: () => void;
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const {
    toggleSettings,
    canUndo,
    undo,
    suggestionCode,
    setCode,
    toggleSidebar,
  } = useAppStore();

  // Build commands list
  const commands: CommandType[] = [
    {
      id: "integrate-suggestion",
      name: "Integrate AI Suggestion",
      shortcut: ["⌘", "I"],
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        if (suggestionCode) {
          setCode(suggestionCode);
          onOpenChange(false);
        }
      },
    },
    {
      id: "undo",
      name: "Undo Last Change",
      shortcut: ["⌘", "Z"],
      icon: <RotateCcw className="h-4 w-4" />,
      action: () => {
        if (canUndo()) {
          undo();
          onOpenChange(false);
        }
      },
    },
    {
      id: "settings",
      name: "Open Settings",
      icon: <Settings className="h-4 w-4" />,
      action: () => {
        toggleSettings();
        onOpenChange(false);
      },
    },
    {
      id: "toggle-sidebar",
      name: "Toggle Sidebar",
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        toggleSidebar();
        onOpenChange(false);
      },
    },
    {
      id: "keyboard-shortcuts",
      name: "Keyboard Shortcuts",
      icon: <Key className="h-4 w-4" />,
      action: () => {
        // Show shortcuts dialog (in a real app)
        onOpenChange(false);
      },
    },
    {
      id: "search-code",
      name: "Search in Code",
      shortcut: ["⌘", "F"],
      icon: <Search className="h-4 w-4" />,
      action: () => {
        // Focus editor and trigger search (in a real app)
        onOpenChange(false);
      },
    },
    {
      id: "help",
      name: "Help & Documentation",
      icon: <HelpCircle className="h-4 w-4" />,
      action: () => {
        // Show help (in a real app)
        onOpenChange(false);
      },
    },
  ];

  // Handle keyboard shortcuts to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  // Disable commands based on app state
  const getDisabledState = (id: string) => {
    switch (id) {
      case "integrate-suggestion":
        return !suggestionCode;
      case "undo":
        return !canUndo();
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              {commands.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={command.action}
                  disabled={getDisabledState(command.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <span className="mr-2 text-muted-foreground">
                      {command.icon}
                    </span>
                    <span>{command.name}</span>
                  </div>
                  {command.shortcut && (
                    <div className="flex items-center">
                      {command.shortcut.map((key, index) => (
                        <React.Fragment key={index}>
                          {index > 0 && (
                            <span className="mx-1 text-muted-foreground">
                              +
                            </span>
                          )}
                          <kbd className="bg-muted text-muted-foreground px-2 py-0.5 text-xs rounded">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
