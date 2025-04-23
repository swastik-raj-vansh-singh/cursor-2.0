import { useRef, useEffect, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { useAppStore } from "@/store/useAppStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MessageSquare, Edit, X } from "lucide-react";
import { toast } from "sonner";

interface CodeEditorProps {
  className?: string;
  onSelectionChange?: (selection: string) => void;
}

export function CodeEditor({ className, onSelectionChange }: CodeEditorProps) {
  const {
    code,
    setCode,
    language,
    editorTheme,
    fontSize,
    lineHeight,
    takeSnapshot,
    activeFile,
    setAiPrompt,
    setIsLoadingSuggestion,
    setSuggestionCode,
    setSelectedCode,
  } = useAppStore();

  const editorRef = useRef<any>(null);
  const [selection, setSelection] = useState<string>("");
  const [showSelectionActions, setShowSelectionActions] =
    useState<boolean>(false);
  const [selectionPosition, setSelectionPosition] = useState({
    top: 0,
    left: 0,
  });
  const [isInlineEdit, setIsInlineEdit] = useState<boolean>(false);
  const [inlinePrompt, setInlinePrompt] = useState<string>("");
  const [inlineEditBoxPosition, setInlineEditBoxPosition] = useState({
    top: 0,
    left: 0,
  });

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getModel().getValueInRange(e.selection);
      setSelection(selection);

      if (selection) {
        const position = editor.getScrolledVisiblePosition(
          e.selection.getStartPosition()
        );
        if (position) {
          setSelectionPosition({
            top: position.top - 40,
            left: position.left,
          });
          setInlineEditBoxPosition({
            top: position.top - 68,
            left: position.left,
          });
          setShowSelectionActions(true);
        }
      } else {
        setShowSelectionActions(false);
        setIsInlineEdit(false);
      }

      if (onSelectionChange) {
        onSelectionChange(selection);
      }
    });

    editor.onDidChangeCursorPosition(() => {
      if (!editor.getSelection().isEmpty()) return;
      setShowSelectionActions(false);
      setIsInlineEdit(false);
    });

    if (code) {
      takeSnapshot(code);
    }
  };

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  // Update this function to use setSelectedCode
  const addToPrompt = () => {
    // Format the selection as a code block with proper language
    const lang = activeFile
      ? activeFile.path.split(".").pop() || language
      : language;
    const formattedSelection = `\`\`\`${lang}\n${selection}\n\`\`\``;

    // Set the selected code in the store
    setSelectedCode(formattedSelection);

    // Show confirmation
    toast.success("Code added to AI Assistant", {
      duration: 2000,
      position: "bottom-center",
    });

    setShowSelectionActions(false);
  };

  // Inline edit box (shows above, submit prompt directly)
  const showInlineEditBox = () => {
    setIsInlineEdit(true);
    setInlinePrompt("");
  };

  const handleInlineEditSubmit = () => {
    if (!inlinePrompt.trim()) return;

    // Format the code with the instructions for the AI Assistant
    const lang = activeFile
      ? activeFile.path.split(".").pop() || language
      : language;
    const formattedMessage = `I need help with this code:\n\`\`\`${lang}\n${selection}\n\`\`\`\n\nInstructions: ${inlinePrompt}`;

    // Send to AI Assistant
    setSelectedCode(formattedMessage);

    // Show confirmation
    toast.success("Sent to AI Assistant", {
      duration: 2000,
      position: "bottom-center",
    });

    // Close the inline edit box
    setIsInlineEdit(false);
    setShowSelectionActions(false);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize,
        lineHeight,
      });
    }
  }, [fontSize, lineHeight]);

  return (
    <div className={`h-full w-full relative ${className}`}>
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={activeFile?.content || code}
        theme={editorTheme}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          fontFamily: "JetBrains Mono, monospace",
          lineHeight,
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          wordWrap: "on",
          rulers: [],
          glyphMargin: true,
          folding: true,
          lineNumbersMinChars: 3,
          padding: { top: 10 },
        }}
      />

      {isInlineEdit && (
        <div
          className="absolute z-20 border border-border bg-background shadow-lg rounded flex items-center p-1 space-x-2"
          style={{
            top: `${inlineEditBoxPosition.top}px`,
            left: `${inlineEditBoxPosition.left}px`,
            minWidth: "180px",
          }}
        >
          <input
            type="text"
            className="text-xs px-2 py-1 h-7 border rounded bg-muted outline-none"
            placeholder="Describe the edit…"
            value={inlinePrompt}
            onChange={(e) => setInlinePrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInlineEditSubmit();
              else if (e.key === "Escape") setIsInlineEdit(false);
            }}
            autoFocus
          />
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={handleInlineEditSubmit}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setIsInlineEdit(false)}
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showSelectionActions && selection && (
        <div
          className="absolute z-10 bg-card rounded-md shadow-md border border-border flex"
          style={{
            top: `${selectionPosition.top}px`,
            left: `${selectionPosition.left}px`,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8"
            onClick={addToPrompt}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Add to Chat</span>
          </Button>

          <div className="w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8"
            onClick={showInlineEditBox}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Edit</span>
          </Button>
        </div>
      )}
    </div>
  );
}
