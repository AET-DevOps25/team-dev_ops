import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import QueryForm from './QueryForm';
import SettingsForm from './SettingsForm';
import { AnalyzeRequest } from "@/api/client";

interface StartExploringFormProps {
  onAnalyze: (req: AnalyzeRequest) => Promise<void>;
  loadingMessage: string;
}

const StartExploringForm: React.FC<StartExploringFormProps> = ({ onAnalyze, loadingMessage }) => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [autoDetect, setAutoDetect] = useState<boolean>(true);
  const [maxArticles, setMaxArticles] = useState<number>(50);
  const [nrTopics, setNrTopics] = useState<number>(5);
  const [source, setSource] = useState<"research" | "community">("research");
  const [feed, setFeed] = useState<string>("cs.CV");

  const handleAnalyze = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    const startTime = Date.now();

    const req: AnalyzeRequest = {
      query,
      auto_detect: autoDetect,
      max_articles: maxArticles,
      nr_topics: nrTopics,
    };

    if (!autoDetect) {
      req.source   = source === 'research' ? 'arxiv' : 'reddit';
      req.category = feed;
    }

    try {
      await onAnalyze(req);
    } finally {
      const duration = Date.now() - startTime;
      const minDisplayTime = 3000; // ensure spinner visible ≥ 3 s for UX clarity
      if (duration < minDisplayTime) {
        setTimeout(() => setIsLoading(false), minDisplayTime - duration);
      } else {
        setIsLoading(false);
      }
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Explore Emerging Trends</CardTitle>
        <CardDescription>
          Discover semantic trends using AI-powered analysis of research papers and community discussions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Always show the query input */}
        <QueryForm
          query={query}
          onQueryChange={setQuery}
          onAnalyze={handleAnalyze}
          onShowSettings={toggleSettings}
          showSettings={showSettings}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
        />

        {/* Conditionally render settings below the query */}
        {showSettings && (
          <div className="mt-6">
            <SettingsForm
              autoDetect={autoDetect}
              maxArticles={maxArticles}
              query={query}
              source={source}
              feed={feed}
              onAutoDetectChange={setAutoDetect}
              onMaxArticlesChange={setMaxArticles}
              onSourceChange={setSource}
              onFeedChange={setFeed}
              onBackToInput={toggleSettings}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              nrTopics={nrTopics}
              onNrTopicsChange={setNrTopics}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StartExploringForm;
