import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import TopicResult from './TopicResult';
import { Topic } from '@/api/client';

interface AnalysisItemProps {
  id: string;
  query: string;
  timestamp: string | undefined;
  type: 'Research' | 'Community';
  topics: Topic[];
  feedUrl?: string;  // Add feedUrl to show the actual query used
  onDelete: (id: string) => void;
  darkMode?: boolean;
}

const AnalysisItem: React.FC<AnalysisItemProps> = ({
  id,
  query,
  timestamp,
  type,
  topics,
  feedUrl,
  onDelete,
  darkMode = false
}) => {
  const [showTopics, setShowTopics] = useState(false);
  const [showQueryDetails, setShowQueryDetails] = useState(false);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalArticles = topics.reduce((sum, topic) => sum + topic.article_count, 0);

  // Parse the query type and details
  const getQueryInfo = () => {
    if (!feedUrl) {
      return null;
    }

    // Check if it's a Reddit URL
    if (feedUrl.includes('reddit.com')) {
      const subreddit = feedUrl.match(/\/r\/([^\/\.]+)/)?.[1];
      return {
        type: 'Reddit Community',
        details: subreddit ? `r/${subreddit}` : feedUrl,
        queryType: 'community'
      };
    }

    // ------------------------------------------------------------
    // Handle arXiv API URLs: extract and decode the search_query
    // ------------------------------------------------------------
    let queryPart: string | null = null;
    const match = feedUrl.match(/[?&]search_query=([^&]+)/);
    if (match && match[1]) {
      queryPart = decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    // Fall back to raw URL if we did not find a query param (e.g., we stored cat:xyz directly)
    if (!queryPart) {
      queryPart = feedUrl;
    }

    // Simple ArXiv category (e.g., "cat:cs.CL" or "cs.CL")
    if (queryPart.match(/^cat:[a-z]+\.[A-Z]{2,}$/) || queryPart.match(/^[a-z]+\.[A-Z]{2,}$/)) {
      const category = queryPart.startsWith('cat:') ? queryPart.replace('cat:', '') : queryPart;
      return {
        type: 'ArXiv Category',
        details: category,
        queryType: 'simple',
        category
      };
    }

    // Advanced arXiv query (contains cat: plus free-text via all:"…" or AND etc.)
    if (queryPart.includes('all:') || queryPart.includes('AND') || (queryPart.includes('cat:') && queryPart.includes(' '))) {
      return {
        type: 'ArXiv Advanced Query',
        details: queryPart,
        queryType: 'advanced',
        category: queryPart.match(/cat:([^\s]+)/)?.[1],
        searchTerms: queryPart.match(/all:(?:"([^"]+)"|([^\s]+))/)?.[1]
      };
    }

    // Fallback – unknown query pattern
    return {
      type: 'ArXiv',
      details: queryPart,
      queryType: 'other'
    };
  };

  const queryInfo = getQueryInfo();

  return (
    <div className={`border rounded-lg p-4 mb-4 ${
      darkMode
        ? 'border-white/10 bg-black/20'
        : 'border-black/10 bg-white'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className={`font-medium text-lg mb-1 ${
            darkMode ? 'text-white' : 'text-foreground'
          }`}>
            {query}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className={darkMode ? 'text-white/60' : 'text-muted-foreground'}>
              {formatDate(timestamp)}
            </span>
            <Badge
              variant="outline"
              className={`${
                darkMode ? 'border-blue-400/30 text-blue-400' : 'border-blue-600/20 text-blue-600'
              } text-xs`}
            >
              {type}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(id)}
          className={`p-2 ${
            darkMode
              ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4 text-sm">
          <span className={`${darkMode ? 'text-white/80' : 'text-foreground'} font-medium`}>
            {topics.length} topics • {totalArticles} articles
          </span>
          {queryInfo && (
            <Badge
              variant="outline"
              className={`${
                queryInfo.queryType === 'advanced'
                  ? (darkMode ? 'border-purple-400/30 text-purple-400' : 'border-purple-600/20 text-purple-600')
                  : queryInfo.queryType === 'simple'
                  ? (darkMode ? 'border-blue-400/30 text-blue-400' : 'border-blue-600/20 text-blue-600')
                  : (darkMode ? 'border-green-400/30 text-green-400' : 'border-green-600/20 text-green-600')
              } text-xs`}
            >
              {queryInfo.type}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTopics(!showTopics)}
            className={`text-xs ${
              darkMode
                ? 'text-white/80 hover:text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>View All Topics</span>
            {showTopics ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          {queryInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQueryDetails(!showQueryDetails)}
              className={`text-xs ${
                darkMode
                  ? 'text-white/80 hover:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Query Details</span>
              {showQueryDetails ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>
      </div>

      {showQueryDetails && queryInfo && (
        <div className={`mt-4 p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-black/5'
        }`}>
          <h4 className={`font-medium text-sm mb-3 ${darkMode ? 'text-white' : 'text-foreground'}`}>
            Search Query Details
          </h4>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className={`text-xs font-medium ${darkMode ? 'text-white/80' : 'text-muted-foreground'}`}>
                  Query Type:
                </span>
                <p className={`text-sm font-mono ${darkMode ? 'text-white' : 'text-foreground'}`}>
                  {queryInfo.type}
                </p>
              </div>

              {queryInfo.category && (
                <div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-white/80' : 'text-muted-foreground'}`}>
                    ArXiv Category:
                  </span>
                  <p className={`text-sm font-mono ${darkMode ? 'text-white' : 'text-foreground'}`}>
                    {queryInfo.category}
                  </p>
                </div>
              )}
            </div>

            {queryInfo.searchTerms && (
              <div>
                <span className={`text-xs font-medium ${darkMode ? 'text-white/80' : 'text-muted-foreground'}`}>
                  Search Terms:
                </span>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-foreground'}`}>
                  "{queryInfo.searchTerms}"
                </p>
              </div>
            )}

            <div>
              <span className={`text-xs font-medium ${darkMode ? 'text-white/80' : 'text-muted-foreground'}`}>
                {queryInfo.queryType === 'advanced' ? 'ArXiv API Query:' : 'Feed URL:'}
              </span>
              <div className={`mt-1 p-2 rounded text-xs font-mono break-all ${
                darkMode ? 'bg-black/30 text-white/90' : 'bg-white border text-foreground'
              }`}>
                {queryInfo.details}
              </div>
            </div>

            {queryInfo.queryType === 'advanced' && (
              <div className={`text-xs ${darkMode ? 'text-white/60' : 'text-muted-foreground'}`}>
                💡 This advanced query searches for specific terms within the selected ArXiv category,
                providing more targeted results than a simple category search.
              </div>
            )}
          </div>
        </div>
      )}

      {showTopics && (
        <div className="mt-4 space-y-4">
          {topics.map((topic, index) => (
            <TopicResult
              key={topic.id}
              {...topic}
              articleCount={topic.article_count}
              rank={index + 1}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisItem;
