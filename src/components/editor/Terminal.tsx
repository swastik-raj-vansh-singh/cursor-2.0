import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  TerminalSquare,
  Plus,
  RefreshCw,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Terminal() {
  const { toggleTerminal, activeFile } = useAppStore();
  const [output, setOutput] = useState<string[]>([
    "> Terminal initialized",
    '> Type "help" for available commands',
  ]);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState("1");
  const terminalRef = useRef<HTMLDivElement>(null);

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();

    if (!command.trim()) return;

    // Add command to output
    setOutput((prev) => [...prev, `$ ${command}`]);

    // Add to history
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    // Mock command handling
    const trimmedCommand = command.trim().toLowerCase();

    // Split command and args
    const [cmd, ...args] = trimmedCommand.split(" ");

    // Basic command parsing
    switch (cmd) {
      case "help":
        setOutput((prev) => [
          ...prev,
          "> Available commands:",
          "  help    - Show this help message",
          "  clear   - Clear the terminal",
          "  run     - Run the current file",
          "  ls      - List directory contents",
          "  cd      - Change directory",
          "  pwd     - Print working directory",
          "  echo    - Print text",
          "  version - Show game engine version",
        ]);
        break;
      case "clear":
        setOutput([]);
        break;
      case "run":
        if (activeFile) {
          setOutput((prev) => [
            ...prev,
            `> Running ${activeFile.name}...`,
            "> Executing script...",
            "> Output:",
            "--------------------",
            "  Hello, world!",
            "  Script completed successfully.",
            "--------------------",
          ]);
        } else {
          setOutput((prev) => [...prev, "> Error: No active file to run"]);
        }
        break;
      case "ls":
        setOutput((prev) => [
          ...prev,
          "> Directory listing:",
          "  src/",
          "  public/",
          "  package.json",
          "  tsconfig.json",
          "  vite.config.ts",
          "  index.html",
        ]);
        break;
      case "cd":
        if (args.length === 0) {
          setOutput((prev) => [...prev, "> Changed to home directory"]);
        } else {
          setOutput((prev) => [...prev, `> Changed to ${args[0]} directory`]);
        }
        break;
      case "pwd":
        setOutput((prev) => [...prev, "> /game-code-forge-ide"]);
        break;
      case "echo":
        if (args.length > 0) {
          setOutput((prev) => [...prev, `> ${args.join(" ")}`]);
        } else {
          setOutput((prev) => [...prev, "> "]);
        }
        break;
      case "version":
        setOutput((prev) => [...prev, "> Game Engine v1.0.0"]);
        break;
      default:
        setOutput((prev) => [...prev, `> Command not found: ${command}`]);
    }

    setCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      // Navigate history up
      if (history.length > 0) {
        const newIndex =
          historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      // Navigate history down
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand("");
      }
      e.preventDefault();
    } else if (e.key === "Tab") {
      // Simple tab completion
      if (command.startsWith("r")) {
        setCommand("run");
        e.preventDefault();
      } else if (command.startsWith("c")) {
        setCommand("clear");
        e.preventDefault();
      }
    }
  };

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Create a new terminal tab
  const addTerminalTab = () => {
    setActiveTab("2");
    setOutput([
      "> New terminal session started",
      '> Type "help" for available commands',
    ]);
  };

  // Clear the terminal
  const clearTerminal = () => {
    setOutput([]);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center px-3 py-1 border-b border-border">
        <TerminalSquare className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium mr-4">Terminal</span>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="h-7 bg-transparent">
            <TabsTrigger value="1" className="h-6 px-3 text-xs">
              bash
            </TabsTrigger>
            {activeTab === "2" && (
              <TabsTrigger value="2" className="h-6 px-3 text-xs">
                bash
              </TabsTrigger>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={addTerminalTab}
              title="New Terminal"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </TabsList>
        </Tabs>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearTerminal}
            title="Clear Terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="More Actions"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={toggleTerminal}
            title="Close Terminal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 overflow-auto p-3 font-mono text-sm bg-card"
      >
        {output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap mb-1">
            {line}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleRunCommand}
        className="p-2 border-t border-border flex"
      >
        <span className="text-muted-foreground mr-2">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none"
          placeholder="Enter command..."
          autoFocus
        />
      </form>
    </div>
  );
}
