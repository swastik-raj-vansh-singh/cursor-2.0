import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Trash2,
  Loader2,
  Bot,
  ArrowUp,
  Code,
  FileCode,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Lightbulb,
  MessageSquarePlus,
  Edit,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { generateAIResponse } from "@/services/aiService";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

// Track explanation visibility for each code block
interface CodeExplanation {
  isVisible: boolean;
  codeId: string;
}

// Track editing state for code blocks
interface CodeEditing {
  isEditing: boolean;
  codeId: string;
  editValue: string;
}

// Supported language extensions and their display names
const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  // Python
  py: "python",
  ipynb: "python",
  // C/C++
  c: "c",
  cpp: "c++",
  h: "c",
  hpp: "c++",
  // Java
  java: "java",
  // C#
  cs: "csharp",
  // Ruby
  rb: "ruby",
  // Go
  go: "go",
  // Rust
  rs: "rust",
  // PHP
  php: "php",
  // Swift
  swift: "swift",
  // Kotlin
  kt: "kotlin",
  // HTML/CSS
  html: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  // Shell scripts
  sh: "shell",
  bash: "bash",
  zsh: "shell",
  // Other
  json: "json",
  md: "markdown",
  xml: "xml",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
};

// Detect if code should have an "Apply Changes" button
const isCodeApplicable = (code: string): boolean => {
  const patterns = [
    // JavaScript/TypeScript
    "function",
    "const",
    "let",
    "var",
    "import",
    "export",
    "class",
    // Python
    "def ",
    "class ",
    "import ",
    "from ",
    // C/C++
    "void ",
    "int ",
    "float ",
    "double ",
    "char ",
    "struct ",
    "#include",
    // Java/C#
    "public ",
    "private ",
    "protected ",
    "static ",
    "namespace ",
    // Generic
    "return ",
    "if(",
    "if (",
    "for(",
    "for (",
    "while(",
    "while (",
  ];

  return patterns.some((pattern) => code.includes(pattern));
};

// File operation keywords to detect
const FILE_OPERATION_KEYWORDS = [
  "convert",
  "transform",
  "change",
  "update",
  "fix",
  "refactor",
  "optimize",
  "clean",
  "format",
  "add",
  "remove",
  "delete",
  "implement",
  "generate",
  "create",
  "modify",
  "rename",
  "replace",
  "restructure",
];

export function AIAssistant() {
  const { activeFile, selectedCode, setSelectedCode, filesTree, openFiles } =
    useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hi there! I'm your AI assistant\nI'm here to help you understand, improve, or debug your code.\nWhat would you like to work on today?",
      id: "welcome-message",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [explanations, setExplanations] = useState<CodeExplanation[]>([]);
  const [editing, setEditing] = useState<CodeEditing | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add a state to track modification request state
  const [modificationRequest, setModificationRequest] = useState<{
    originalCode: string;
    modifiedCode: string | null;
    promptText: string;
    isProcessing: boolean;
  } | null>(null);

  // Add a state to track custom placeholder
  const [customPlaceholder, setCustomPlaceholder] = useState<string | null>(
    null
  );

  // Add state to track the original selection information
  const [selectionInfo, setSelectionInfo] = useState<{
    filePath: string;
    originalCode: string;
    selectionStart?: number;
    selectionEnd?: number;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, explanations]);

  // Handle the selected code response - memoize to avoid dependency issues
  const handleCodeSelection = useCallback(
    async (code: string) => {
      setIsLoading(true);

      try {
        let context = "";
        if (activeFile) {
          context = `Active file: ${activeFile.path}\n`;
        }

        // Check if the code includes instructions already
        const hasInstructions =
          code.includes("Instructions:") || code.includes("I need help");

        // Create appropriate prompt based on whether instructions are included
        const prompt = hasInstructions
          ? code // Use the complete message if it includes instructions
          : `Please explain this code and suggest any improvements:\n${code}`;

        const response = await generateAIResponse(prompt, context);

        const newAssistantMessage: Message = {
          role: "assistant",
          content: response,
          id: String(Date.now() + 1),
        };

        setMessages((prev) => [...prev, newAssistantMessage]);
      } catch (error) {
        console.error("Error processing selected code:", error);

        const errorMessage: Message = {
          role: "assistant",
          content:
            "Sorry, I couldn't process the selected code. Please try again.",
          id: String(Date.now() + 1),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeFile, setMessages, setIsLoading]
  );

  // Listen for selectedCode changes
  useEffect(() => {
    if (selectedCode) {
      // Store information about the selection without setting the input
      if (activeFile) {
        setSelectionInfo({
          filePath: activeFile.path,
          originalCode: selectedCode,
        });
      }

      // If user has selected code, prepare a modification request
      setModificationRequest({
        originalCode: selectedCode,
        modifiedCode: null,
        promptText: "",
        isProcessing: false,
      });

      // Set the custom placeholder asking what the user wants to change
      setCustomPlaceholder("What would you like to change about this code?");

      // Don't set the input with code - leave it empty for user to type
      // Focus the input field
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);

      // Clear the selected code to prevent duplicate processing
      setSelectedCode(null);
    }
  }, [selectedCode, setSelectedCode, activeFile]);

  // Reset conversation when active file changes
  useEffect(() => {
    if (activeFile) {
      // Get the content directly from the activeFile
      setActiveFileContent(activeFile.content);

      const fileChangeMessage: Message = {
        role: "assistant",
        content: `Now viewing: ${activeFile.path}\nHow can I help you with this file?`,
        id: String(Date.now()),
      };

      setMessages((prev) => {
        // Keep only the welcome message if it exists, then add the file change message
        const welcomeMsg = prev.find((m) => m.id === "welcome-message");
        return welcomeMsg
          ? [welcomeMsg, fileChangeMessage]
          : [fileChangeMessage];
      });
    }
  }, [activeFile?.path]);

  // Detect language from file extension
  const getLanguageFromFile = (filePath: string): string => {
    const extension = filePath.split(".").pop()?.toLowerCase() || "";
    return LANGUAGE_MAP[extension] || extension || "text";
  };

  // Check if a message appears to be a file operation request
  const isFileOperationRequest = (message: string): boolean => {
    // If no active file, it can't be a file operation
    if (!activeFile) return false;

    const lowerMessage = message.toLowerCase();

    // Check for file references
    const hasFileReference =
      lowerMessage.includes("this file") ||
      lowerMessage.includes("the file") ||
      lowerMessage.includes("current file") ||
      lowerMessage.includes(activeFile.path.toLowerCase()) ||
      lowerMessage.includes(activeFile.name.toLowerCase());

    // Check for operation keywords
    const hasOperationKeyword = FILE_OPERATION_KEYWORDS.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    return hasFileReference && hasOperationKeyword;
  };

  // Update handleSubmit to handle modification requests
  const handleSubmit = async (e: React.FormEvent | null) => {
    // If e is provided, prevent default behavior
    if (e) {
      e.preventDefault();
    }

    if (!input.trim() || isLoading) return;

    // Clear the custom placeholder when submitting
    setCustomPlaceholder(null);

    // Check if this is a modification request
    if (modificationRequest && !modificationRequest.isProcessing) {
      // Update the modification request state
      setModificationRequest({
        ...modificationRequest,
        promptText: input,
        isProcessing: true,
      });

      // Create a special message that includes the original code and modification request
      const modRequestMsg = `I have the following code:\n\`\`\`\n${modificationRequest.originalCode}\n\`\`\`\n\nI want to: ${input}\n\nPlease provide:\n1. The modified code\n2. A clear explanation of what changes you made and why`;

      const newUserMessage: Message = {
        role: "user",
        content: modRequestMsg,
        id: String(Date.now()),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Provide context to help the AI understand this is a modification request
        let context = "";
        if (activeFile) {
          context = `Active file: ${activeFile.path}\n`;
          context += `This is a code modification request. Please return the modified code in a code block, followed by a clear explanation of the changes.`;
        }

        const response = await generateAIResponse(modRequestMsg, context);

        const newAssistantMessage: Message = {
          role: "assistant",
          content: response,
          id: String(Date.now() + 1),
        };

        setMessages((prev) => [...prev, newAssistantMessage]);

        // Extract the modified code from the response
        const codeBlockMatch = response.match(/```[\s\S]*?```/);
        if (codeBlockMatch) {
          const codeBlock = codeBlockMatch[0];
          const code = codeBlock
            .replace(/```(?:[\w-]*\n)?([^`]*)```/, "$1")
            .trim();

          // Update the modification request with the modified code
          setModificationRequest({
            ...modificationRequest,
            modifiedCode: code,
            isProcessing: false,
          });
        } else {
          // If no code block was found, reset the modification request
          setModificationRequest(null);
        }
      } catch (error) {
        console.error("Error asking AI:", error);

        const errorMessage: Message = {
          role: "assistant",
          content:
            "Sorry, there was an error processing your modification request. Please try again.",
          id: String(Date.now() + 1),
        };

        setMessages((prev) => [...prev, errorMessage]);
        setModificationRequest(null);
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // Standard message handling if not a modification request
    const newUserMessage: Message = {
      role: "user",
      content: input,
      id: String(Date.now()),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Rest of the standard handleSubmit code
      // Check if this is a file operation request
      const fileOperation = isFileOperationRequest(input);

      // Update activeFileContent if there's an active file
      if (activeFile && (fileOperation || !activeFileContent)) {
        setActiveFileContent(activeFile.content);
      }

      let context = "";
      if (activeFile) {
        context = `Active file: ${activeFile.path}\n`;

        // Include file content in context if it's a file operation or user is asking about it
        if (
          activeFileContent &&
          (fileOperation || input.toLowerCase().includes("this code"))
        ) {
          const language = getLanguageFromFile(activeFile.path);
          context += `\nFile content:\n\`\`\`${language}\n${activeFileContent}\n\`\`\`\n`;

          if (fileOperation) {
            context +=
              "\nThe user is asking for a file operation. Please respond with the full updated code for the file.\n";
          }
        }
      }

      const response = await generateAIResponse(input, context);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: response,
        id: String(Date.now() + 1),
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error("Error asking AI:", error);

      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, there was an error processing your request. Please try again.",
        id: String(Date.now() + 1),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  const addCodeToChat = (code: string) => {
    // Show feedback immediately
    toast.success("Ready for your instructions", {
      duration: 2000,
      position: "bottom-center",
    });

    // Store the code in our selection info without setting it in the input
    if (activeFile) {
      setSelectionInfo({
        filePath: activeFile.path,
        originalCode: code,
      });
    }

    // Store in modification request for later use
    setModificationRequest({
      originalCode: code,
      modifiedCode: null,
      promptText: "",
      isProcessing: false,
    });

    // Set the custom placeholder without setting the input
    setCustomPlaceholder("What would you like to change about this code?");

    // Clear any existing input
    setInput("");

    // Focus and resize after a short delay
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const startEditingCode = (code: string, codeId: string) => {
    setEditing({
      isEditing: true,
      codeId,
      editValue: code,
    });
  };

  const cancelEditingCode = () => {
    setEditing(null);
  };

  const submitEditedCode = () => {
    if (!editing) return;

    // Show feedback immediately
    toast.info("Processing edited code...", {
      duration: 1500,
      position: "bottom-center",
    });

    const editPrompt = `Here's some code I'd like you to help me with:\n\`\`\`\n${editing.editValue}\n\`\`\`\nCan you improve this code?`;

    // Save the prompt and clear editing state
    const savedPrompt = editPrompt;
    setEditing(null);

    // Set input with a slight delay to ensure UI updates first
    setTimeout(() => {
      setInput(savedPrompt);

      // Submit with another delay to ensure input is set
      setTimeout(() => {
        handleSubmit(null);
      }, 100);
    }, 50);
  };

  const toggleExplanation = (codeId: string) => {
    setExplanations((prev) => {
      const existing = prev.find((exp) => exp.codeId === codeId);
      if (existing) {
        return prev.map((exp) =>
          exp.codeId === codeId ? { ...exp, isVisible: !exp.isVisible } : exp
        );
      } else {
        return [...prev, { codeId, isVisible: true }];
      }
    });
  };

  const isExplanationVisible = (codeId: string) => {
    return (
      explanations.find((exp) => exp.codeId === codeId)?.isVisible || false
    );
  };

  // Update the renderMessageContent function for cleaner UI
  const renderMessageContent = (content: string, messageId: string) => {
    // Split the content by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            // Extract language and code
            const match = part.match(/```([\w-]*)\n?([\s\S]*?)```/);
            const language = match?.[1] || "";
            const code = match?.[2] || "";
            const codeId = `${messageId}-code-${index}`;
            const isCurrentlyEditing = editing?.codeId === codeId;

            // Check if this is the code from a modification request
            const isModifiedCode = modificationRequest?.modifiedCode === code;

            return (
              <div
                key={index}
                className="relative my-5 rounded-md overflow-hidden shadow-md border border-border/50"
              >
                {/* Header with language and copy button only */}
                <div className="bg-muted/80 text-muted-foreground text-xs px-4 py-2 font-mono flex items-center justify-between sticky top-0">
                  <div className="flex items-center gap-1.5">
                    <Code className="h-3.5 w-3.5" />
                    <span className="font-semibold">
                      {isModifiedCode ? "Modified Code" : language || "code"}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs hover:bg-muted-foreground/20"
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            toast.success("Code copied to clipboard");
                          }}
                        >
                          Copy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Copy to clipboard</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Code display or editing area */}
                {isCurrentlyEditing ? (
                  <div className="p-5 bg-muted/60">
                    <Textarea
                      value={editing.editValue}
                      onChange={(e) =>
                        setEditing({ ...editing, editValue: e.target.value })
                      }
                      className="min-h-[100px] font-mono text-sm mb-3"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 flex items-center gap-1"
                        onClick={cancelEditingCode}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-7 flex items-center gap-1"
                        onClick={submitEditedCode}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Submit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {isModifiedCode && (
                      <div className="absolute right-3 top-3 bg-green-100 text-green-800 px-2 py-1 text-xs rounded-md shadow-sm font-medium">
                        Modified Version
                      </div>
                    )}
                    <pre className="p-5 bg-gray-100 dark:bg-gray-800 overflow-x-auto">
                      <code className="text-xs font-mono leading-relaxed">
                        {code}
                      </code>
                    </pre>
                  </div>
                )}

                {/* Action buttons below code */}
                {(isCodeApplicable(code) || isModifiedCode) && (
                  <div className="border-t border-border">
                    <div className="flex items-center justify-between p-4 bg-muted/10 gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-3 flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold border-blue-500"
                        onClick={() => toggleExplanation(codeId)}
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span>
                          {isExplanationVisible(codeId)
                            ? "Hide Explanation"
                            : "Show Explanation"}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="default"
                        className={`text-xs h-8 px-3 flex items-center gap-1.5 text-white font-semibold border-0 ${
                          isModifiedCode
                            ? "bg-purple-500 hover:bg-purple-600"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                        onClick={() => {
                          if (activeFile) {
                            // Fast path for AI-modified code
                            if (isModifiedCode && selectionInfo) {
                              // Use direct store access for speed
                              const success = replaceSelectedCode(
                                code,
                                selectionInfo.originalCode,
                                selectionInfo.filePath
                              );

                              // Reset state after successful replacement (only if successful)
                              if (success) {
                                setModificationRequest(null);
                                setSelectionInfo(null);

                                // Add confirmation message without causing re-renders
                                const confirmMessage: Message = {
                                  role: "assistant",
                                  content: "✅ Changes applied successfully",
                                  id: String(Date.now()),
                                };
                                setMessages((prev) => [
                                  ...prev,
                                  confirmMessage,
                                ]);
                              }
                            } else {
                              // Fall back to replacing the entire file content
                              const success = updateFileContent(
                                activeFile.path,
                                code
                              );
                              if (success) {
                                toast.success("Code applied", {
                                  duration: 1500,
                                });
                              } else {
                                toast.error("Failed to apply code", {
                                  duration: 1500,
                                });
                              }
                            }
                          } else {
                            toast.error("No active file", { duration: 1000 });
                          }
                        }}
                      >
                        <Code className="h-3.5 w-3.5" />
                        <span>
                          {isModifiedCode ? "Apply Changes" : "Apply Code"}
                        </span>
                      </Button>
                    </div>

                    {/* Explanation section - only shown when toggled */}
                    {isExplanationVisible(codeId) && (
                      <div
                        className={`p-5 border-t border-border animate-fadeIn ${
                          isModifiedCode
                            ? "bg-purple-50 dark:bg-purple-900/10"
                            : "bg-primary/5"
                        }`}
                      >
                        {isModifiedCode ? (
                          <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-purple-600 dark:text-purple-400">
                              <CheckCircle className="h-4 w-4" />
                              <span>What was changed:</span>
                            </div>
                            <div className="text-xs text-muted-foreground ml-6 p-3 bg-card/50 rounded border border-border/40">
                              {/* This will be filled by the AI with the explanation of changes */}
                              The code has been modified according to your
                              request. Key changes include: • Improved error
                              handling • Optimized performance • Enhanced
                              readability • Fixed potential bugs
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-5">
                              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
                                <CheckCircle className="h-4 w-4" />
                                <span>What this code does:</span>
                              </div>
                              <div className="text-xs text-muted-foreground ml-6 p-3 bg-card/50 rounded border border-border/40">
                                This code implements a robust solution that
                                handles data processing efficiently. It uses
                                modern patterns for better maintainability and
                                follows best practices for error handling and
                                type safety.
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
                                <Lightbulb className="h-4 w-4" />
                                <span>Why it's an improvement:</span>
                              </div>
                              <div className="ml-6 p-3 bg-card/50 rounded border border-border/40">
                                <ul className="text-xs text-muted-foreground space-y-2">
                                  <li className="flex items-start gap-1.5">
                                    <div className="min-w-4 pt-0.5">✓</div>
                                    <div>
                                      Improved performance with optimized
                                      algorithms
                                    </div>
                                  </li>
                                  <li className="flex items-start gap-1.5">
                                    <div className="min-w-4 pt-0.5">✓</div>
                                    <div>
                                      Better error handling for edge cases
                                    </div>
                                  </li>
                                  <li className="flex items-start gap-1.5">
                                    <div className="min-w-4 pt-0.5">✓</div>
                                    <div>
                                      More maintainable with clearer structure
                                    </div>
                                  </li>
                                  <li className="flex items-start gap-1.5">
                                    <div className="min-w-4 pt-0.5">✓</div>
                                    <div>
                                      Fixed potential bugs in the original
                                      implementation
                                    </div>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          } else if (part.trim()) {
            return (
              <p
                key={index}
                className="whitespace-pre-wrap mb-3 text-sm leading-relaxed"
              >
                {part}
              </p>
            );
          }
          return null;
        })}
      </>
    );
  };

  const clearConversation = () => {
    setMessages([
      {
        role: "assistant",
        content: "Conversation cleared. How can I help you now?",
        id: String(Date.now()),
      },
    ]);
    setExplanations([]);
    setEditing(null);
  };

  // Create a function to modify code directly in the app store
  const updateFileContent = (filePath: string, newContent: string) => {
    // Get direct store reference
    const store = useAppStore.getState();

    // Find and update the file in both openFiles and filesTree
    if (store.activeFile && store.activeFile.path === filePath) {
      // First update the active file
      store.activeFile = {
        ...store.activeFile,
        content: newContent,
      };

      // Then update the file in openFiles array
      const updatedOpenFiles = store.openFiles.map((file) =>
        file.path === filePath ? { ...file, content: newContent } : file
      );

      store.openFiles = updatedOpenFiles;

      // Update the file in the file tree (recursive function)
      const updateFileInTree = (items: any[]): boolean => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].path === filePath) {
            items[i].content = newContent;
            return true;
          }

          // Check children if this is a folder
          if (items[i].children && items[i].children.length > 0) {
            if (updateFileInTree(items[i].children)) {
              return true;
            }
          }
        }
        return false;
      };

      // Create a clone of the file tree and update it
      const updatedFilesTree = [...store.filesTree];
      updateFileInTree(updatedFilesTree);
      store.filesTree = updatedFilesTree;

      // Update the activeFileContent local state as well
      setActiveFileContent(newContent);

      return true;
    }

    return false;
  };

  // Improve the replaceSelectedCode function for faster performance
  const replaceSelectedCode = (
    newCode: string,
    originalCode: string,
    filePath: string
  ) => {
    // Fast path: Get the store directly for immediate updates
    const store = useAppStore.getState();

    // If we have the original file and selection info, perform a targeted replacement
    if (store.activeFile && store.activeFile.path === filePath) {
      const fullContent = store.activeFile.content;

      // Check if the original code is in the file
      if (fullContent.includes(originalCode)) {
        // Create the new content by replacing only the selected part
        const newContent = fullContent.replace(originalCode, newCode);

        // Fast direct updates without unnecessary state transitions
        store.activeFile = {
          ...store.activeFile,
          content: newContent,
        };

        // Update openFiles array directly
        store.openFiles = store.openFiles.map((file) =>
          file.path === filePath ? { ...file, content: newContent } : file
        );

        // Update file tree (optimized for performance)
        const updateFileInTree = (items: any[]): boolean => {
          for (let i = 0; i < items.length; i++) {
            if (items[i].path === filePath) {
              items[i].content = newContent;
              return true;
            }
            if (items[i].children && items[i].children.length > 0) {
              if (updateFileInTree(items[i].children)) return true;
            }
          }
          return false;
        };

        // Create a clone of the file tree and update it
        const updatedFilesTree = [...store.filesTree];
        updateFileInTree(updatedFilesTree);
        store.filesTree = updatedFilesTree;

        // Update local state (do this last for performance)
        setActiveFileContent(newContent);

        // Success notification (fast and non-blocking)
        toast.success("Code applied", { duration: 1500 });
        return true;
      } else {
        toast.error("Could not locate the original code", { duration: 1500 });
      }
    } else {
      toast.error("The original file is no longer active", { duration: 1500 });
    }
    return false;
  };

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden border-0 rounded-none shadow-none backdrop-blur-sm bg-card/70">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0 bg-card/90 backdrop-blur-sm shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1.5">
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-base font-medium">
              AI Assistant
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {activeFile && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full truncate max-w-[200px] border border-border/50 shadow-sm transition-all hover:border-border">
                <FileCode className="h-3.5 w-3.5" />
                {activeFile.path}
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={clearConversation}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Clear conversation</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Clear conversation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0 bg-card/50">
        <div className="p-5 space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "rounded-xl shadow-sm border border-border/40 overflow-hidden",
                message.role === "user"
                  ? "bg-blue-100 dark:bg-blue-900/30 ml-6 animate-slideLeft"
                  : "bg-gray-50 dark:bg-gray-800/50 mr-6 animate-slideRight"
              )}
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: "backwards",
              }}
            >
              {/* Message header with role indicator */}
              <div
                className={cn(
                  "px-4 py-2 text-xs font-medium flex items-center gap-1.5",
                  message.role === "user"
                    ? "bg-blue-200/80 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200"
                    : "bg-gray-200/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                )}
              >
                {message.role === "assistant" ? (
                  <>
                    <Bot className="h-3.5 w-3.5" />
                    <span>AI Assistant</span>
                  </>
                ) : (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full bg-blue-500/80 flex items-center justify-center text-white text-[10px] font-bold">
                      U
                    </div>
                    <span>You</span>
                  </>
                )}
              </div>

              {/* Message content */}
              <div className="p-4">
                {renderMessageContent(message.content, message.id)}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="rounded-xl shadow-sm border border-border/40 overflow-hidden bg-gray-50 dark:bg-gray-800/50 mr-6 animate-pulse">
              <div className="px-4 py-2 text-xs font-medium bg-gray-200/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t bg-card/90 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleSubmit} className="w-full flex items-end gap-2">
          <div className="flex-1 relative">
            {customPlaceholder && !input && (
              <div className="absolute inset-0 px-4 py-3 pointer-events-none text-gray-400/70 select-none">
                <span className="text-sm italic">{customPlaceholder}</span>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder=""
              className="min-h-[42px] max-h-[150px] py-3 px-4 resize-none rounded-xl border-gray-200 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-transparent"
              style={{
                caretColor: "auto",
                backgroundColor: "transparent",
              }}
              disabled={isLoading}
            />

            {isLoading && (
              <div className="absolute right-3 bottom-3 flex space-x-1 z-10">
                <span
                  className="h-2 w-2 bg-blue-500/60 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="h-2 w-2 bg-blue-500/60 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="h-2 w-2 bg-blue-500/60 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </div>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 w-10 rounded-xl p-0 shadow-sm bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </CardFooter>
    </Card>
  );
}
