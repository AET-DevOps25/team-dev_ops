import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Article } from '@/api/client';

interface TopicResultProps {
  title: string;
  description: string;
  articleCount: number;
  relevance: number;
  articles?: Article[];
  darkMode?: boolean;
  rank?: number;
  topicId?: string;
}

const TopicResult: React.FC<TopicResultProps> = ({
  title,
  description,
  articleCount,
  relevance,
  articles = [],
  darkMode = false,
  rank,
}) => {
  const [showArticles, setShowArticles] = useState(false);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [animateBar, setAnimateBar] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateBar(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const toggleArticleExpanded = (articleId: string) => {
    const newExpanded = new Set(expandedArticles);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedArticles(newExpanded);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return darkMode ? 'bg-green-500' : 'bg-green-600';
    if (score >= 60) return darkMode ? 'bg-yellow-500' : 'bg-yellow-600';
    if (score >= 40) return darkMode ? 'bg-orange-500' : 'bg-yellow-600';
    return darkMode ? 'bg-red-500' : 'bg-red-600';
  };

  return (
    <div className={`border ${darkMode ? 'border-white/10' : 'border-black/5'} rounded-lg p-4 mb-4 ${darkMode ? 'hover:border-primary/50' : 'hover:border-primary/20'} transition-all duration-300 ease-in-out group`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {rank && (
            <Badge
              variant="outline"
              className={`${darkMode ? 'border-primary/30 text-primary' : 'border-primary/20 text-primary'} text-xs font-mono`}
            >
              #{rank}
            </Badge>
          )}
          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-foreground'}`}>{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${darkMode ? 'border-white/20 text-white/90' : 'border-black/10'} text-xs`}
          >
            {articleCount} articles
          </Badge>
          <Badge
            variant="outline"
            className={`${darkMode ? 'border-green-400/30 text-green-400' : 'border-green-600/20 text-green-600'} text-xs`}
          >
            Semantic
          </Badge>
        </div>
      </div>
      <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-muted-foreground'} mb-3`}>{description}</p>
      <div className="w-full mt-3">
        <div className={`flex justify-between text-xs mb-1 ${darkMode ? 'text-white/80' : ''}`}>
          <span>Relevance Score</span>
          <span className="font-mono">{relevance}%</span>
        </div>
        <div className={`h-2 w-full ${darkMode ? 'bg-white/10' : 'bg-black/5'} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${getRelevanceColor(relevance)} rounded-full transition-all duration-1000 ease-out group-hover:opacity-90`}
            style={{ width: animateBar ? `${relevance}%` : '0%' }}
          />
        </div>
      </div>
      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowArticles(!showArticles)}
          className={`w-full justify-between text-xs ${darkMode ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <span>View Articles ({articles.length})</span>
          {showArticles ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        {showArticles && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {articles.length > 0 ? (
              articles.map((article) => {
                const isExpanded = expandedArticles.has(article.id);
                return (
                  <div
                    key={article.id}
                    className={`text-xs p-3 rounded-md ${darkMode ? 'bg-white/5' : 'bg-black/5'} border ${darkMode ? 'border-white/10' : 'border-black/5'} hover:${darkMode ? 'bg-white/10' : 'bg-black/10'} transition-colors`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className={`font-medium ${isExpanded ? '' : 'line-clamp-2'} ${darkMode ? 'text-white' : 'text-foreground'}`}>{article.title}</h4>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleArticleExpanded(article.id)}
                          className={`h-6 w-6 p-0 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1 rounded ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    {article.summary && (
                      <p className={`mt-1 ${isExpanded ? '' : 'line-clamp-2'} ${darkMode ? 'text-white/60' : 'text-muted-foreground'}`}>{article.summary}</p>
                    )}
                  </div>
                );
              })
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicResult;
