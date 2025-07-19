import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, ChevronUp, Settings, Loader2 } from "lucide-react";

interface QueryFormProps {
  query: string;
  onQueryChange: (query: string) => void;
  onAnalyze: () => void;
  onShowSettings: () => void;
  showSettings?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
}

const QueryForm: React.FC<QueryFormProps> = ({
  query,
  onQueryChange,
  onAnalyze,
  onShowSettings,
  showSettings = false,
  isLoading = false,
  loadingMessage = "Discovering Topics..."
}) => {

  // Handler for key presses on the input field
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Enter will also work, when the settings panel is open.
      if (query.trim() && !isLoading) {
        e.preventDefault();
        onAnalyze();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="query-input">Query</Label>
        <Input
          id="query-input"
          placeholder="e.g., Show fast-growing trends in CV for 3D registration"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleInputKeyDown} // Start analysis on Enter key press
          className="w-full transition-all duration-200"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          AI will automatically discover semantic topic clusters using vector embeddings
        </p>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="relative">
          <Button
            variant="outline"
            onClick={onShowSettings}
            className="border-black/10 transition-all duration-300 hover:border-primary/50"
            disabled={isLoading}
          >
            <Settings className="settings-icon h-4 w-4 mr-2" />
            Settings {showSettings ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <style dangerouslySetInnerHTML={{
            __html: `
              .settings-icon {
                transition: transform 0.3s ease-out;
              }
              button:hover .settings-icon {
                transform: rotate(90deg);
              }
            `
          }} />
        </div>

        {!showSettings && (
          <div className="relative">
            <Button
              onClick={onAnalyze}
              disabled={!query.trim() || isLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              <span className="analyze-text relative">
                {isLoading ? loadingMessage : "Analyze Trends"}
                <span className="analyze-underline"></span>
              </span>
            </Button>
            <style dangerouslySetInnerHTML={{
              __html: `
                .analyze-underline {
                  position: absolute;
                  left: 0;
                  right: 0;
                  bottom: -1px;
                  height: 1px;
                  background: rgba(255, 255, 255, 0.5);
                  transform: scaleX(0);
                  transform-origin: left;
                  transition: transform 0.5s ease-in-out;
                }
                button:hover .analyze-underline {
                  transform: scaleX(1);
                }
              `
            }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryForm;