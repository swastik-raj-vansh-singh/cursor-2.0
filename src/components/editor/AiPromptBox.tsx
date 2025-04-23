import { useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/useAppStore";
interface AiPromptBoxProps {
  onSubmit: (prompt: string, code: string) => void;
  className?: string;
}

export function AiPromptBox({ onSubmit, className }: AiPromptBoxProps) {
  const { aiPrompt, setAiPrompt, code, isLoadingSuggestion } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (aiPrompt.trim() && !isLoadingSuggestion) {
      onSubmit(aiPrompt, code);
    }
  };

  return (
    <div
      className={`flex flex-col bg-card border border-border rounded-md shadow-sm ${className}`}
    >
      <Textarea
        ref={textareaRef}
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder="Describe what you want the AI to do…"
        className={
          "resize-none w-full min-h-[100px] max-h-[160px] text-sm bg-muted border-0 rounded-t-md focus:ring-0 focus:border-none transition-none"
        }
        style={{
          minHeight: "100px",
          maxHeight: "160px",
        }}
      />
      <div className="flex justify-end items-center gap-2 px-2 py-1">
        <Button
          onClick={handleSubmit}
          disabled={!aiPrompt.trim() || isLoadingSuggestion}
          size="sm"
          className="h-7 px-3 gap-1 text-xs"
        >
          <Send className="w-4 h-4" />
          Submit
        </Button>
      </div>
    </div>
  );
}
