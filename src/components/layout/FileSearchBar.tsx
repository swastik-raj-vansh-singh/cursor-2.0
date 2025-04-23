import { useState } from "react";
import { Search, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function FileSearchBar({
  onResultClick,
}: {
  onResultClick: (id: string, line?: number) => void;
}) {
  const { openFiles, activeFile, setActiveFile } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; content: string; line: number }[]
  >([]);

  const searchFiles = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    // Search both openFiles and default files (handle mock data)
    let filesToSearch = openFiles;
    // Search for file name and content
    let found: typeof results = [];
    filesToSearch.forEach((file) => {
      // Search name
      if (file.name.toLowerCase().includes(value.toLowerCase())) {
        found.push({ id: file.id, name: file.name, content: "", line: 0 });
      }
      // Search contents line by line
      file.content.split("\n").forEach((line, idx) => {
        if (line.toLowerCase().includes(value.toLowerCase()))
          found.push({
            id: file.id,
            name: file.name,
            content: line.trim(),
            line: idx + 1,
          });
      });
    });
    setResults(found.slice(0, 10)); // First 10 results for now
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <div className="p-2 pb-1">
      <div className="flex items-center bg-muted rounded px-2">
        <Search className="h-4 w-4 mr-1 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => searchFiles(e.target.value)}
          placeholder="Search files or text…"
          className="h-7 bg-transparent border-none shadow-none p-0 text-sm focus:ring-0"
          style={{ minWidth: "0" }}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={clearSearch}
            title="Clear search"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      {query && results.length > 0 && (
        <ScrollArea className="mt-2 max-h-48 border bg-card rounded shadow z-30">
          {results.map((res, i) => (
            <button
              key={i}
              className="flex w-full px-2 py-1 text-left text-xs hover:bg-accent rounded"
              onClick={() => onResultClick(res.id, res.line)}
            >
              <span>
                <span className="font-medium text-sidebar-primary">
                  {res.name}
                </span>
                {res.line ? (
                  <span className="text-muted-foreground ml-1">
                    :{res.line}
                  </span>
                ) : null}
              </span>
              {res.content && (
                <span className="ml-2 text-muted-foreground truncate max-w-[160px]">
                  {res.content}
                </span>
              )}
            </button>
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
