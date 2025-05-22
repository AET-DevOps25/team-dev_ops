import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface SettingsFormProps {
  autoDetect: boolean;
  maxArticles: number;
  trendClusters: number;
  query: string;
  onAutoDetectChange: (checked: boolean) => void;
  onMaxArticlesChange: (value: number) => void;
  onTrendClustersChange: (value: number) => void;
  onBackToInput: () => void;
  onAnalyze: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  autoDetect,
  maxArticles,
  trendClusters,
  query,
  onAutoDetectChange,
  onMaxArticlesChange,
  onTrendClustersChange,
  onBackToInput,
  onAnalyze
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between space-x-4">
        <div className="space-y-0.5">
          <Label htmlFor="auto-detect">Auto-detect source</Label>
          <p className="text-sm text-muted-foreground">
            Automatically determine if query is research or community focused
          </p>
        </div>
        <Switch 
          id="auto-detect"
          checked={autoDetect}
          onCheckedChange={onAutoDetectChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-articles">Maximum articles to analyze</Label>
        <Input
          id="max-articles"
          type="number"
          min={1}
          max={100}
          value={maxArticles}
          onChange={(e) => onMaxArticlesChange(parseInt(e.target.value, 10) || 1)}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="trend-clusters">Number of trend clusters to identify</Label>
        <Input
          id="trend-clusters"
          type="number"
          min={1}
          max={10}
          value={trendClusters}
          onChange={(e) => onTrendClustersChange(parseInt(e.target.value, 10) || 1)}
          className="w-full"
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBackToInput}
          className="border-black/10 hover:border-primary/50 transition-all duration-300"
        >
          Back to Input
        </Button>
        
        <div className="relative">
          <Button 
            onClick={onAnalyze}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:bg-primary/90 transition-all duration-300"
            variant="default"
            disabled={!query.trim()}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="analyze-text relative">
              Analyze Trends
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
      </div>
    </div>
  );
};

export default SettingsForm; 