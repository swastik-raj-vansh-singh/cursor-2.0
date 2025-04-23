import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Copy,
  ArrowRight,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  TerminalSquare,
  Code,
  RefreshCw,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export function SuggestionPanel() {
  const {
    suggestionCode,
    isLoadingSuggestion,
    code,
    setCode,
    setLanguage,
    language,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<string>("chat");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI programming assistant. How can I help you today?",
    },
  ]);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const [showAcceptedMessage, setShowAcceptedMessage] = useState(false);

  const handleAcceptSuggestion = () => {
    if (suggestionCode) {
      setCode(suggestionCode);
      setShowAcceptedMessage(true);

      // Hide the accepted message after 2 seconds
      setTimeout(() => {
        setShowAcceptedMessage(false);
        setHasSuggestion(false);
      }, 2000);
    }
  };

  const handleCopySuggestion = () => {
    if (suggestionCode) {
      navigator.clipboard.writeText(suggestionCode);
    }
  };

  // Mocked example of code suggestion and explanation
  const exampleSuggestion = {
    title: "Add player leveling system",
    originalCode: `function Player(name, health) {
  this.name = name;
  this.health = health;
  
  this.attack = function(target) {
    console.log(this.name + " attacks " + target.name);
    return Math.floor(Math.random() * 10) + 1;
  }
}`,
    suggestion: `function Player(name, health, level = 1) {
  this.name = name;
  this.health = health;
  this.level = level;
  
  this.attack = function(target) {
    // Damage now scales with level
    const baseDamage = Math.floor(Math.random() * 10) + 1;
    const scaledDamage = baseDamage * (1 + (this.level * 0.1));
    console.log(this.name + " attacks " + target.name);
    return Math.floor(scaledDamage);
  }
  
  this.levelUp = function() {
    this.level++;
    this.health += 10;
    console.log(this.name + " leveled up to level " + this.level);
    return this;
  }
}`,
    explanation: [
      {
        type: "text",
        content: "I've enhanced the Player constructor with a leveling system:",
      },
      {
        type: "list",
        items: [
          "Added a default level parameter with value 1",
          "Implemented damage scaling based on player level",
          "Added a levelUp() method that increases level and health",
          'Method returns "this" for method chaining',
        ],
      },
      {
        type: "text",
        content:
          "This change maintains backward compatibility while adding RPG-like progression.",
      },
    ],
  };

  // Use this when there's real suggestion from the AI
  const hasRealSuggestion = !!suggestionCode;

  // Update UI when new suggestion arrives
  if (suggestionCode && !hasSuggestion) {
    setHasSuggestion(true);
    // Add to chat history
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: "Can you improve this code?" },
      {
        role: "assistant",
        content:
          "I've analyzed your code and have some improvements to suggest. Would you like to see them?",
      },
    ]);
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="chat">
            <TerminalSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <Code className="h-4 w-4 mr-2" />
            Code Suggestions
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "chat" && (
        <div className="flex-1 overflow-auto pb-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === "assistant" ? "pr-4" : "pl-4"
              } 
                          ${
                            message.role === "assistant"
                              ? "text-left"
                              : "text-right"
                          }`}
            >
              <div
                className={`inline-block max-w-[85%] px-4 py-2 rounded-lg 
                          ${
                            message.role === "assistant"
                              ? "bg-primary/10 text-primary-foreground/90"
                              : "bg-secondary text-secondary-foreground"
                          }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
              {message.role === "assistant" && (
                <div className="flex items-center mt-1 text-muted-foreground text-xs space-x-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "suggestions" && (
        <div className="flex-1 overflow-auto">
          {isLoadingSuggestion ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-4" />
              <p>Analyzing your code...</p>
              <p className="text-sm mt-2">Generating intelligent suggestions</p>
            </div>
          ) : hasSuggestion || hasRealSuggestion ? (
            <div className="space-y-4">
              {showAcceptedMessage ? (
                <div className="flex flex-col items-center justify-center h-48 text-green-500">
                  <CheckCircle className="h-12 w-12 mb-2" />
                  <p className="text-lg font-medium">Changes Applied</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                    <h3 className="text-lg font-medium">
                      Suggested Improvements
                    </h3>
                  </div>

                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="bg-card px-4 py-2 border-b border-border">
                      <h4 className="font-medium">Current Code</h4>
                    </div>
                    <div className="p-1 bg-code-background">
                      <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          background: "transparent",
                          fontSize: "0.85rem",
                          padding: "1rem",
                        }}
                      >
                        {hasRealSuggestion
                          ? code
                          : exampleSuggestion.originalCode}
                      </SyntaxHighlighter>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>

                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="bg-card px-4 py-2 border-b border-border">
                      <h4 className="font-medium">Improved Code</h4>
                    </div>
                    <div className="p-1 bg-code-background">
                      <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          background: "transparent",
                          fontSize: "0.85rem",
                          padding: "1rem",
                        }}
                      >
                        {hasRealSuggestion
                          ? suggestionCode
                          : exampleSuggestion.suggestion}
                      </SyntaxHighlighter>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-md p-4 space-y-3">
                    <h4 className="font-medium flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                      Changes Explained
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>The improvements include:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Added a leveling system with default level=1</li>
                        <li>
                          Implemented damage scaling based on player level
                        </li>
                        <li>
                          Added levelUp() method to increase level and health
                        </li>
                        <li>Made methods chainable by returning "this"</li>
                      </ul>
                      <p>
                        These changes maintain backward compatibility while
                        adding RPG-like progression.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySuggestion}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button size="sm" onClick={handleAcceptSuggestion}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply Changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-yellow-500/60" />
              <h3 className="text-lg font-medium mb-2">AI Code Suggestions</h3>
              <p className="max-w-md mx-auto">
                Ask the AI to generate code suggestions by entering a prompt
                below. The AI will analyze your code and suggest improvements.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
