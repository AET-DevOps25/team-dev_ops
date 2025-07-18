import React from 'react';
import AnalysisItem from './AnalysisItem';
import { AnalysisResponse } from '@/api/client';

interface AnalysisHistoryProps {
  analyses: AnalysisResponse[];
  onDeleteAnalysis: (id: string) => void;
  darkMode?: boolean;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  analyses,
  onDeleteAnalysis,
  darkMode = false
}) => {
  if (analyses.length === 0) {
    return (
      <div className={`text-center py-8 ${darkMode ? 'text-white/60' : 'text-muted-foreground'}`}>
        <p>No analyses yet. Try analyzing a query above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis) => (
        <AnalysisItem
          key={analysis.id}
          id={analysis.id}
          query={analysis.query}
          timestamp={analysis.created_at}
          type={analysis.type === 'research' ? 'Research' : 'Community'}
          topics={analysis.topics ?? []}
          feedUrl={analysis.feed_url}
          onDelete={onDeleteAnalysis}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
};

export default AnalysisHistory; 