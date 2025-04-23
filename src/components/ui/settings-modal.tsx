import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { CodeLanguage } from "@/store/useAppStore";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    language,
    setLanguage,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    theme,
  } = useAppStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editor Settings</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme">Theme</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
                <ThemeToggle />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="language">Language</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as CodeLanguage)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="csharp">C#</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="fontSize">Font Size: {fontSize}px</Label>
            </div>
            <Slider
              id="fontSize"
              min={10}
              max={24}
              step={1}
              value={[fontSize]}
              onValueChange={([value]) => setFontSize(value)}
              className="w-full"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="lineHeight">Line Height: {lineHeight}px</Label>
            </div>
            <Slider
              id="lineHeight"
              min={16}
              max={32}
              step={2}
              value={[lineHeight]}
              onValueChange={([value]) => setLineHeight(value)}
              className="w-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
