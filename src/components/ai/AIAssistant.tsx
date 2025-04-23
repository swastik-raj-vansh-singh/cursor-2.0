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
  RotateCcw,
  Copy,
  Clipboard,
  MessageSquare,
  Pencil,
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
  codeId: string;
  whatItDoes: string;
  improvements: string[];
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
  const [codeExplanations, setCodeExplanations] = useState<CodeExplanation[]>(
    []
  );
  const [visibleExplanations, setVisibleExplanations] = useState<string[]>([]);
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
    selectionContext?: {
      filePath: string;
      selectionStart?: number;
      selectionEnd?: number;
    };
  } | null>(null);

  // First, add a state to track the placeholder text
  const [inputPlaceholder, setInputPlaceholder] = useState(
    "Ask about your code..."
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, codeExplanations]);

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

  // Update the useEffect that handles selected code to track selection context
  useEffect(() => {
    if (selectedCode) {
      // If user has selected code, prepare a modification request
      setModificationRequest({
        originalCode: selectedCode,
        modifiedCode: null,
        promptText: "",
        isProcessing: false,
        selectionContext: activeFile
          ? {
              filePath: activeFile.path,
              // We'll track that this came from the current file
              // Actual selection positions aren't available here, but we know it's in the active file
            }
          : undefined,
      });

      // Set placeholder text instead of actual input
      setInputPlaceholder("What would you like to change about this code?");
      setInput(""); // Ensure the input is empty

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
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Reset placeholder to default
    setInputPlaceholder("Ask about your code...");

    // --- Handle Modification Request ---
    if (modificationRequest && !modificationRequest.isProcessing) {
      const languageForPrompt = getLanguageFromFile(activeFile?.path || "");

      // 1. Format the message shown to the user in the chat
      const formattedUserMessage = `Looking at the following code:
\`\`\`${languageForPrompt}
${modificationRequest.originalCode}
\`\`\`

My request: ${input}`;

      // 2. Format the detailed prompt sent to the AI backend
      const modRequestPromptForAI = `Original Code:
\`\`\`${languageForPrompt}
${modificationRequest.originalCode}
\`\`\`

User Request: ${input}

Please provide the following response structure:
1.  **Modified Code:** Enclose the complete modified code snippet within a single markdown code block (\`\`\`language ... \`\`\`).
2.  **Explanation:** Provide a clear explanation with these sections:
    *   **What the code does:** Describe the functionality of the modified code.
    *   **How it improves the original:** Explain the specific improvements made compared to the original code.
    *   **Why the change was made:** Justify the reasoning behind the modifications based on the user request or best practices.`;

      // Update the modification request state
      setModificationRequest((prev) =>
        prev ? { ...prev, promptText: input, isProcessing: true } : null
      );

      // Add user message to chat
      const newUserMessage: Message = {
        role: "user",
        content: formattedUserMessage,
        id: String(Date.now()),
      };
      setMessages((prev) => [...prev, newUserMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Prepare context for AI
        let context = "";
        if (activeFile) {
          context = `Active file: ${activeFile.path}\n`;
          context += `This is a code modification request. Follow the requested response structure carefully.`;
        }

        // Send the detailed prompt to the AI service
        const response = await generateAIResponse(
          modRequestPromptForAI,
          context
        );

        // Add AI response to chat
        const newAssistantMessage: Message = {
          role: "assistant",
          content: response,
          id: String(Date.now() + 1),
        };
        setMessages((prev) => [...prev, newAssistantMessage]);

        // Extract modified code from AI response
        const codeBlockMatch = response.match(/```[\s\S]*?```/);
        if (codeBlockMatch) {
          const codeBlock = codeBlockMatch[0];
          const codeMatch = codeBlock.match(/```(?:[\w-]*\n)?([\s\S]*?)```/);
          const code = codeMatch ? codeMatch[1].trim() : "";

          if (code) {
            setModificationRequest((prev) =>
              prev ? { ...prev, modifiedCode: code, isProcessing: false } : null
            );
          } else {
            console.warn("Could not extract code from AI response code block.");
            setModificationRequest(null);
          }
        } else {
          console.warn(
            "AI response did not contain a code block for modification request."
          );
          setModificationRequest(null);
        }
      } catch (error) {
        console.error("Error processing modification request:", error);
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

      return; // Exit after handling modification request
    }

    // --- Handle Standard Message ---
    let userContent = input;
    const hasCodeBlock = input.includes("```");
    if (!hasCodeBlock && activeFile) {
      // Auto-include active file content if user mentions "this code" etc.
      if (
        input.toLowerCase().includes("this code") ||
        input.toLowerCase().includes("the code") ||
        input.toLowerCase().includes("above code")
      ) {
        const lang = getLanguageFromFile(activeFile.path);
        userContent = `Looking at the following code:
\`\`\`${lang}
${activeFileContent || activeFile.content}
\`\`\`

${input}`;
      }
    }

    // Add user message to chat
    const newUserMessageStandard: Message = {
      role: "user",
      content: userContent,
      id: String(Date.now()),
    };
    setMessages((prev) => [...prev, newUserMessageStandard]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare context for standard request
      const fileOperation = isFileOperationRequest(input);
      if (activeFile && (fileOperation || !activeFileContent)) {
        setActiveFileContent(activeFile.content);
      }
      let context = "";
      if (activeFile) {
        context = `Active file: ${activeFile.path}\n`;
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

      // Send standard prompt to AI
      const response = await generateAIResponse(userContent, context);

      // Add AI response to chat
      const newAssistantMessageStandard: Message = {
        role: "assistant",
        content: response,
        id: String(Date.now() + 1),
      };
      setMessages((prev) => [...prev, newAssistantMessageStandard]);
    } catch (error) {
      console.error("Error asking AI (standard request):", error);
      const errorMessageStandard: Message = {
        role: "assistant",
        content:
          "Sorry, there was an error processing your request. Please try again.",
        id: String(Date.now() + 1),
      };
      setMessages((prev) => [...prev, errorMessageStandard]);
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
    toast.success("Code added to chat input", {
      duration: 2000,
      position: "bottom-center",
    });

    // First set the input
    setInput(code);

    // Then focus and resize after a short delay to ensure state is updated
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(
          textareaRef.current.scrollHeight,
          150
        )}px`;
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

  const toggleExplanation = useCallback(
    (codeId: string) => {
      setVisibleExplanations((prev) => {
        const isCurrentlyVisible = prev.includes(codeId);
        if (isCurrentlyVisible) {
          return prev.filter((id) => id !== codeId);
        } else {
          // Check if we already have an explanation for this code
          const hasExplanation = codeExplanations.some(
            (exp) => exp.codeId === codeId
          );

          // If no explanation exists, generate one
          if (!hasExplanation) {
            // Find the message containing this code
            const message = messages.find((msg) =>
              msg.content.includes(`\`\`\`${codeId}`)
            );

            if (message && message.role === "assistant") {
              // Generate a basic explanation
              const newExplanation: CodeExplanation = {
                codeId,
                whatItDoes:
                  "This code implements the requested functionality with proper error handling and optimization.",
                improvements: [
                  "Improved code organization and readability",
                  "Better error handling for edge cases",
                  "More efficient implementation",
                  "Following modern best practices",
                ],
              };

              setCodeExplanations((prev) => [...prev, newExplanation]);
            }
          }

          return [...prev, codeId];
        }
      });
    },
    [codeExplanations, messages]
  );

  const isExplanationVisible = (codeId: string) => {
    return visibleExplanations.includes(codeId);
  };

  // Reset explanations when messages change
  useEffect(() => {
    // Clear explanation visibility when new messages arrive
    if (messages.length > 0) {
      // Only keep explanations for existing messages
      const messageIds = messages.map((m) => m.id);
      setCodeExplanations((prev) =>
        prev.filter((exp) => {
          const [messageId] = exp.codeId.split("-code-");
          return messageIds.includes(messageId);
        })
      );
    }
  }, [messages.length]);

  // Add a function to replace selected code
  const replaceSelectedCode = (newCode: string) => {
    if (!activeFile || !modificationRequest?.selectionContext) {
      toast.error("Cannot replace code - no active selection context");
      return;
    }

    try {
      const currentContent = activeFile.content;

      // If we're replacing the entire file
      if (modificationRequest.originalCode === currentContent) {
        const success = updateFileContent(activeFile.path, newCode);
        if (success) {
          toast.success("Code replaced successfully");
          setModificationRequest(null);
        } else {
          toast.error("Failed to replace code");
        }
        return;
      }

      // Replace just the selected portion
      if (currentContent.includes(modificationRequest.originalCode)) {
        const newContent = currentContent.replace(
          modificationRequest.originalCode,
          newCode
        );
        const success = updateFileContent(activeFile.path, newContent);

        if (success) {
          toast.success("Selected code replaced successfully");
          setModificationRequest(null);
        } else {
          toast.error("Failed to replace selected code");
        }
      } else {
        toast.error("Cannot locate the originally selected code in the file");
      }
    } catch (error) {
      console.error("Error replacing selected code:", error);
      toast.error("Error replacing code");
    }
  };

  // Update the renderMessageContent function to handle formatted markdown responses
  const renderMessageContent = (content: string, messageId: string) => {
    // Check if the content matches the pattern: "1. **Modified Code:**" followed by code and explanation
    const modifiedCodePattern =
      /1\.\s+\*\*Modified Code:\*\*\s*\n([\s\S]*?)(?:\n\s*2\.\s+\*\*Explanation:\*\*|$)/;
    const explanationPattern =
      /2\.\s+\*\*Explanation:\*\*\s*\n([\s\S]*?)(?:\n\s*\d+\.\s+\*\*|$)/;

    const modifiedCodeMatch = content.match(modifiedCodePattern);
    const explanationMatch = content.match(explanationPattern);

    // If we found the special format, render it with our custom UI
    if (modifiedCodeMatch && messageId.includes("assistant")) {
      const code = modifiedCodeMatch[1].trim();
      const explanation = explanationMatch ? explanationMatch[1].trim() : "";

      // Extract explanation sections if possible
      const whatItDoesMatch = explanation.match(
        /\*\s+\*\*What the code does:\*\*\s*\n([\s\S]*?)(?:\n\s*\*\s+\*\*|$)/
      );
      const improvesMatch = explanation.match(
        /\*\s+\*\*How it improves the original:\*\*\s*\n([\s\S]*?)(?:\n\s*\*\s+\*\*|$)/
      );
      const whyChangedMatch = explanation.match(
        /\*\s+\*\*Why the change was made:\*\*\s*\n([\s\S]*?)(?:\n\s*\*\s+\*\*|$)/
      );

      const whatItDoes = whatItDoesMatch ? whatItDoesMatch[1].trim() : "";
      const howItImproves = improvesMatch ? improvesMatch[1].trim() : "";
      const whyChanged = whyChangedMatch ? whyChangedMatch[1].trim() : "";

      // Generate a unique ID for this code block
      const codeId = `${messageId}-code-formatted`;

      // Automatically create an explanation for this formatted response
      if (!codeExplanations.some((exp) => exp.codeId === codeId)) {
        // Create formatted improvements from the text
        const improvements = howItImproves
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.replace(/^-\s+/, ""));

        setCodeExplanations((prev) => [
          ...prev,
          {
            codeId,
            whatItDoes,
            improvements:
              improvements.length > 0
                ? improvements
                : ["Improved code according to requirements"],
          },
        ]);
      }

      return (
        <div className="relative my-5 rounded-md overflow-hidden border border-border/50">
          {/* Modified Code heading */}
          <div className="p-3 bg-muted font-medium border-b border-border/50">
            Modified Code
          </div>

          {/* Code display with copy button at top */}
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 bg-muted/50 hover:bg-muted"
                      onClick={() => {
                        navigator.clipboard.writeText(code);
                        toast.success("Code copied to clipboard", {
                          duration: 2000,
                        });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="sr-only">Copy code</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Copy code</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <pre className="p-5 bg-gray-100 dark:bg-gray-800 overflow-x-auto">
              <code className="text-xs font-mono leading-relaxed">{code}</code>
            </pre>
          </div>

          {/* Action buttons */}
          <div className="border-t border-border bg-muted/5 p-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => toggleExplanation(codeId)}
            >
              {isExplanationVisible(codeId) ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Hide Explanation
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Show Explanation
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs"
              onClick={() => replaceSelectedCode(code)}
            >
              <Code className="h-3.5 w-3.5 mr-1" />
              Apply Changes
            </Button>
          </div>

          {/* Explanation section - only shown when toggled */}
          {isExplanationVisible(codeId) && (
            <div className="border-t border-border bg-muted/5 p-4">
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span>What this code does:</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {whatItDoes ||
                    "This code implements the requested functionality."}
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                  <Lightbulb className="h-4 w-4" />
                  <span>How it improves the original:</span>
                </div>
                <div className="ml-6">
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    {(
                      howItImproves
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .map((line) => line.replace(/^-\s+/, "")) || [
                        "Improved code organization and readability",
                        "Better error handling for edge cases",
                      ]
                    ).map((improvement, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <div className="min-w-4 pt-0.5">✓</div>
                        <div>{improvement}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                  <Info className="h-4 w-4" />
                  <span>Why the change was made:</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {whyChanged ||
                    "Changes were implemented to fulfill the requested requirements."}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Original code to handle standard code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const match = part.match(/```([\w-]*)\n?([\s\S]*?)```/);
            const language = match?.[1] || "";
            const code = match?.[2] || "";
            const codeId = `${messageId}-code-${index}`;
            const isAIMessage = messageId.includes("assistant");

            return (
              <div
                key={index}
                className="relative my-5 rounded-md overflow-hidden border border-border/50"
              >
                {/* Modified Code heading */}
                {isAIMessage && (
                  <div className="p-3 bg-muted font-medium border-b border-border/50">
                    Modified Code
                  </div>
                )}

                {/* Code display with copy button at top */}
                <div className="relative">
                  {isAIMessage && (
                    <div className="absolute top-2 right-2 z-10">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 bg-muted/50 hover:bg-muted"
                              onClick={() => {
                                navigator.clipboard.writeText(code);
                                toast.success("Code copied to clipboard", {
                                  duration: 2000,
                                });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="sr-only">Copy code</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Copy code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}

                  <pre className="p-5 bg-gray-100 dark:bg-gray-800 overflow-x-auto">
                    <code className="text-xs font-mono leading-relaxed">
                      {code}
                    </code>
                  </pre>
                </div>

                {/* Action buttons - only for AI messages */}
                {isAIMessage && (
                  <div className="border-t border-border bg-muted/5 p-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => toggleExplanation(codeId)}
                    >
                      {isExplanationVisible(codeId) ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5 mr-1" />
                          Hide Explanation
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 mr-1" />
                          Show Explanation
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 text-xs"
                      onClick={() => replaceSelectedCode(code)}
                    >
                      <Code className="h-3.5 w-3.5 mr-1" />
                      Apply Changes
                    </Button>
                  </div>
                )}

                {/* Explanation section - only shown when toggled */}
                {isAIMessage && isExplanationVisible(codeId) && (
                  <div className="border-t border-border bg-muted/5 p-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span>What this code does:</span>
                      </div>
                      <div className="text-sm text-muted-foreground ml-6">
                        {codeExplanations.find((exp) => exp.codeId === codeId)
                          ?.whatItDoes ||
                          "This code implements the requested functionality with proper structure and organization."}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                        <Lightbulb className="h-4 w-4" />
                        <span>How it improves the original:</span>
                      </div>
                      <div className="ml-6">
                        <ul className="text-sm text-muted-foreground space-y-1.5">
                          {(
                            codeExplanations.find(
                              (exp) => exp.codeId === codeId
                            )?.improvements || [
                              "Improved code organization and readability",
                              "Better error handling for edge cases",
                              "More efficient implementation",
                              "Following modern best practices",
                            ]
                          ).map((improvement, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <div className="min-w-4 pt-0.5">✓</div>
                              <div>{improvement}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                        <Info className="h-4 w-4" />
                        <span>Why the change was made:</span>
                      </div>
                      <div className="text-sm text-muted-foreground ml-6">
                        These changes were implemented to address the specific
                        requirements while following best practices and ensuring
                        optimal performance and maintainability.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          } else if (part.trim()) {
            return (
              <p
                key={index}
                className="whitespace-pre-wrap mb-3 leading-relaxed"
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
    setCodeExplanations([]);
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

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden border-0 rounded-none shadow-none backdrop-blur-sm bg-card/70">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0 bg-card/90 backdrop-blur-sm shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">
              AI Assistant
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {activeFile && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full truncate max-w-[200px] border border-border/50 shadow-sm transition-all hover:border-border">
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
                    className="h-7 w-7 p-0"
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
        <div className="p-4 space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "p-4 rounded-lg max-w-[95%] animate-fadeIn shadow-sm",
                message.role === "user"
                  ? "bg-primary bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto animate-slideLeft"
                  : "bg-muted bg-gradient-to-br from-muted to-muted/90 animate-slideRight"
              )}
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: "backwards",
              }}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                  <span>AI Assistant</span>
                </div>
              )}
              {renderMessageContent(message.content, message.id)}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted p-4 rounded-lg max-w-[95%] animate-pulse shadow-sm">
              <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
                <span>AI Assistant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="p-3 border-t bg-card/90 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleSubmit} className="w-full flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              className="min-h-[42px] max-h-[150px] py-2 pr-10 resize-none rounded-xl border-muted-foreground/20 shadow-sm focus:border-primary transition-colors"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 bottom-2 flex space-x-1">
                <span
                  className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
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
                  className="h-10 w-10 rounded-xl p-0 shadow-sm"
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
