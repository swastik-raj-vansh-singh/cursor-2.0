import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { CommandPalette } from "@/components/ui/command-palette";
import { SettingsModal } from "@/components/ui/settings-modal";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { FileTab } from "@/components/layout/FileTab";
import { Terminal } from "@/components/editor/Terminal";
import { WelcomeScreen } from "@/components/ui/welcome-screen";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { checkServerHealth } from "@/services/aiService";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Bot, ServerCrash } from "lucide-react";
import { toast } from "sonner";

export function MainLayout() {
  const {
    isCommandPaletteOpen,
    toggleCommandPalette,
    isSettingsOpen,
    toggleSettings,
    isSidebarOpen,
    openFiles,
    activeFile,
    setActiveFile,
    closeFile,
    isTerminalOpen,
  } = useAppStore();

  const [isAiServerAvailable, setIsAiServerAvailable] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(true);

  // Check if AI server is available on component mount
  useEffect(() => {
    const checkAiServer = async () => {
      setIsCheckingServer(true);
      try {
        const isAvailable = await checkServerHealth();
        setIsAiServerAvailable(isAvailable);
        if (!isAvailable) {
          toast.error(
            "AI server is not available. Some features may be limited.",
            {
              duration: 5000,
            }
          );
        } else {
          toast.success("AI assistant connected successfully", {
            duration: 3000,
          });
        }
      } catch (error) {
        setIsAiServerAvailable(false);
        console.error("Error checking AI server:", error);
      } finally {
        setIsCheckingServer(false);
      }
    };

    checkAiServer();
  }, []);

  // Ensure terminal is visible when toggled
  useEffect(() => {
    if (isTerminalOpen) {
      // Scroll to the terminal when it's opened
      setTimeout(() => {
        const terminalElement = document.querySelector(".terminal-container");
        if (terminalElement) {
          terminalElement.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 100);
    }
  }, [isTerminalOpen]);

  // Check if we need to show welcome screen (no open files)
  const showWelcomeScreen = openFiles.length === 0;

  return (
    <KeyboardShortcuts>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex-1 flex overflow-hidden">
          {isSidebarOpen && (
            <div className="hidden md:block w-64 border-r border-border bg-sidebar-background">
              <Sidebar />
            </div>
          )}

          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Main editor panel */}
            <ResizablePanel defaultSize={75} minSize={50}>
              <div className="h-full flex flex-col">
                {openFiles.length > 0 && (
                  <div className="editor-toolbar overflow-x-auto">
                    <div className="flex items-center space-x-1">
                      {openFiles.map((file) => (
                        <FileTab
                          key={file.id}
                          file={file}
                          isActive={activeFile?.id === file.id}
                          onClick={() => setActiveFile(file)}
                          onClose={() => closeFile(file.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 relative">
                  {showWelcomeScreen ? <WelcomeScreen /> : <CodeEditor />}
                </div>

                {isTerminalOpen && (
                  <div className="h-1/3 border-t border-border bg-card terminal-container">
                    <Terminal />
                  </div>
                )}
              </div>
            </ResizablePanel>

            {/* Resizable handle */}
            <ResizableHandle withHandle />

            {/* AI Assistant panel - always visible */}
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              className="overflow-hidden"
            >
              <div className="h-full border-l border-border bg-card/80 backdrop-blur-sm overflow-hidden shadow-[-8px_0px_20px_rgba(0,0,0,0.03)]">
                {isCheckingServer ? (
                  <div className="h-full flex items-center justify-center p-4 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Bot className="h-8 w-8 mb-2 animate-pulse" />
                      <p>Connecting to AI server...</p>
                    </div>
                  </div>
                ) : (
                  <AIAssistant />
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={toggleCommandPalette}
      />

      <SettingsModal open={isSettingsOpen} onOpenChange={toggleSettings} />
    </KeyboardShortcuts>
  );
}
