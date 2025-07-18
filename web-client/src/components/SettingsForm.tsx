import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";

interface SettingsFormProps {
  autoDetect: boolean;
  maxArticles: number;
  nrTopics: number;
  query: string;
  source: "research" | "community";
  feed: string;
  onAutoDetectChange: (checked: boolean) => void;
  onMaxArticlesChange: (value: number) => void;
  onNrTopicsChange: (value: number) => void;
  onSourceChange: (value: "research" | "community") => void;
  onFeedChange: (value: string) => void;
  onBackToInput: () => void;
  onAnalyze: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  autoDetect,
  maxArticles,
  nrTopics,
  query,
  source,
  feed,
  onAutoDetectChange,
  onMaxArticlesChange,
  onNrTopicsChange,
  onSourceChange,
  onFeedChange,
  onBackToInput,
  onAnalyze,
  isLoading = false,
  loadingMessage = "Discovering Topics..."
}) => {
  const [searchTerms, setSearchTerms] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('cs.CV');
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch('/api/v1/sources/arxiv/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error(error);
        // On error, categories will remain an empty object.
        // The UI will show a loading or empty state.
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Update feed whenever category or (optional) search terms change
  useEffect(() => {
    if (source !== 'research') return;

    // If user provided search terms, build advanced query via backend
    if (searchTerms.trim()) {
      fetch('/api/v1/query/build/arxiv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_terms: searchTerms, filters: { category: selectedCategory } })
      })
        .then(res => res.json())
        .then(data => onFeedChange(data.query))
        .catch(err => console.error('Failed to build advanced query:', err));
    } else {
      // No search terms – use plain category as feed
      onFeedChange(selectedCategory);
    }
  }, [searchTerms, selectedCategory, source, onFeedChange]);
  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="space-y-2">
        <Label htmlFor="max-articles">Maximum articles to analyze</Label>
        <Input
          id="max-articles"
          type="number"
          min={1}
          max={150}
          value={maxArticles}
          onChange={(e) => {
            const raw = parseInt(e.target.value, 10);
            const clamped = isNaN(raw) ? 1 : Math.min(150, Math.max(1, raw));
            onMaxArticlesChange(clamped);
          }}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Maximum number of articles (1-150) to use for the analysis.
        </p>
      </div>
      
      {/* Number of topics selection */}
      <div className="space-y-2">
        <Label htmlFor="nr-topics">Maximum number of topics</Label>
        <Input
          id="nr-topics"
          type="number"
          min={1}
          max={7}
          value={nrTopics}
          onChange={(e) => {
            const raw = parseInt(e.target.value, 10);
            const clamped = isNaN(raw) ? 1 : Math.min(7, Math.max(1, raw));
            onNrTopicsChange(clamped);
          }}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Upper limit (1–7). The algorithm may return fewer clusters if the data doesn&apos;t support more.
        </p>
      </div>

      <div className="flex items-center justify-between space-x-4">
        <div className="space-y-0.5">
          <Label htmlFor="auto-detect-query">Use custom query</Label>
          <p className="text-sm text-muted-foreground">
            Bypass AI-generated search query and use your own for topic clustering.
          </p>
        </div>
        <Switch
          id="auto-detect-query"
          checked={!autoDetect}
          onCheckedChange={(checked) => onAutoDetectChange(!checked)}
        />
      </div>

      {/* Manual source selection */}
      {!autoDetect && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-select">Source</Label>
            <select
              id="source-select"
              value={source}
              onChange={(e) => onSourceChange(e.target.value as "research" | "community")}
              className="w-full border border-input rounded-md p-2"
            >
              <option value="research">Research (arXiv)</option>
            </select>
          </div>

          {source === "research" && (
            <div className="space-y-4">

              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="category-select">ArXiv Category</Label>
                <div className="relative">
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-input rounded-md p-2 appearance-none"
                    disabled={categoriesLoading || Object.keys(categories).length === 0}
                  >
                    {categoriesLoading ? (
                      <option>Loading categories...</option>
                    ) : Object.keys(categories).length === 0 ? (
                      <option>Could not load categories</option>
                    ) : (
                      Object.entries(categories).map(([field, categories]) => (
                      <optgroup key={field} label={field}>
                        {categories.map(cat => {
                            const [code, ...nameParts] = cat.split(' - ');
                            const name = nameParts.join(' - ');
                            return <option key={code} value={code}>{code}{name ? ` - ${name}` : ''}</option>;
                        })}
                      </optgroup>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Optional Search Terms Input */}
              <div className="space-y-2">
                <Label htmlFor="search-terms">Optional Search Terms</Label>
                <Input
                  id="search-terms"
                  placeholder="e.g., graph neural network, transformer"
                  value={searchTerms}
                  onChange={(e) => setSearchTerms(e.target.value)}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Refine the query with specific terms (leave blank to search entire category)
                </p>
              </div>

              {/* Generated Query Preview */}
              {feed && (
                <div className="space-y-2">
                  <Label>Generated Query</Label>
                  <div className="p-3 bg-muted rounded-md text-sm font-mono">
                    {feed}
                  </div>
                </div>
              )}
            </div>
          )}

          {source === "community" && (
            <div className="space-y-2">
              <Label htmlFor="feed-input">Subreddit Name</Label>
              <Input
                id="feed-input"
                placeholder="e.g., computervision"
                value={feed}
                onChange={(e) => onFeedChange(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Specify the subreddit name without r/
              </p>
            </div>
          )}
        </div>

      )}

      <div className="flex justify-between pt-4 mt-auto">
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
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
            variant="default"
            disabled={!query.trim() || isLoading}
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
      </div>
    </div>
  );
};

export default SettingsForm;
