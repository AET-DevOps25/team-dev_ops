import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StartExploringForm from './components/StartExploringForm';
import AnalysisHistory from './components/AnalysisHistory';
import { AspectRatio } from "./components/ui/aspect-ratio";
import { analysisApi, AnalyzeRequest, AnalysisResponse, fetchAnalyses } from "@/api/client";
import { AnalysisResponseStatusEnum } from "@/generated/api/models/analysis-response";

// Use OpenAPI generated types directly - no local interfaces needed

const statusMessages: Record<AnalysisResponseStatusEnum, string> = {
  [AnalysisResponseStatusEnum.Pending]: 'Waiting in queue…',
  [AnalysisResponseStatusEnum.Classifying]: 'Classifying query…',
  [AnalysisResponseStatusEnum.FetchingArticles]: 'Fetching articles…',
  [AnalysisResponseStatusEnum.EmbeddingArticles]: 'Embedding articles…',
  [AnalysisResponseStatusEnum.DiscoveringTopics]: 'Discovering topics…',
  [AnalysisResponseStatusEnum.Completed]: 'Completed',
  [AnalysisResponseStatusEnum.Failed]: 'Failed',
};

function App() {
  const [analyses, setAnalyses] = useState<AnalysisResponse[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const discoverStepRef = useRef<number>(0);
  const lastDiscoverUpdateRef = useRef<number>(0);
  const DISCOVER_STEP_INTERVAL_MS = 7000;
  const prevStatusRef = useRef<AnalysisResponseStatusEnum | null>(null);

  const discoveringMessages = [
    'Starting topic clustering…',
    'Extracting term frequencies…',
    'Running BERTopic…',
    'Generating topic representations…',
    'Labelling topics with LLM…'
  ];

  const handleAnalyze = async (req: AnalyzeRequest): Promise<void> => {
    return new Promise<void>(async (resolve) => {
      try {
        setLoadingMessage('Starting analysis...');
        const startRes = await analysisApi.startAnalysis({ analyzeRequest: req });
        // Backend should include Location header: /api/analyses/{id}
        const locationHeader = (startRes.headers?.location ?? startRes.headers?.Location) as string | undefined;
        let analysisId = locationHeader ? locationHeader.split('/').pop()! : undefined;
        if (!analysisId) {
          // Fallback for non-spec servers that return { id } in body
          const body: unknown = (startRes as any).data;
          if (body && typeof body === 'object' && 'id' in (body as any)) {
            analysisId = (body as any).id as string;
          }
        }
        if (!analysisId) {
          alert('Server response did not include analysis id. Please update backend.');
          setLoadingMessage('');
          resolve();
          return;
        }
        const pollInterval = 2000;
        const maxWaitMs = 600000; 
        const startTs = Date.now();

        const poll = async () => {
          try {
            const details = await analysisApi.getAnalysis({ id: analysisId });
            // Convert technical status to friendly text for the UI button
            const friendly = statusMessages[details.data.status as AnalysisResponseStatusEnum] || 'Processing…';

            if (details.data.status === AnalysisResponseStatusEnum.DiscoveringTopics) {
              // If we just entered discovering state, reset step
              if (prevStatusRef.current !== AnalysisResponseStatusEnum.DiscoveringTopics) {
                discoverStepRef.current = 0;
                lastDiscoverUpdateRef.current = Date.now();
                setLoadingMessage(discoveringMessages[0]);
              } else {
                const now = Date.now();
                if (now - lastDiscoverUpdateRef.current >= DISCOVER_STEP_INTERVAL_MS) {
                  const next = Math.min(discoverStepRef.current + 1, discoveringMessages.length - 1);
                  discoverStepRef.current = next;
                  lastDiscoverUpdateRef.current = now;
                  setLoadingMessage(discoveringMessages[next]);
                }
              }
            } else {
              setLoadingMessage(friendly);
              discoverStepRef.current = 0;
              lastDiscoverUpdateRef.current = 0;
            }

            if (details.data.status === AnalysisResponseStatusEnum.Completed || details.data.status === AnalysisResponseStatusEnum.Failed) {
              const historyData = await fetchAnalyses(20);
              setAnalyses(historyData);
              setLoadingMessage('');
              resolve();
              return;
            }

            prevStatusRef.current = details.data.status as AnalysisResponseStatusEnum;
          } catch (err) {
            console.error('Polling failed', err);
          }
          if (Date.now() - startTs < maxWaitMs) {
            setTimeout(poll, pollInterval);
          } else {
            setLoadingMessage('');
            resolve();
          }
        };

        poll();
      } catch (err) {
        console.error('Analysis failed', err);
        alert('Failed to start analysis. Please try again.');
        setLoadingMessage('');
        resolve();
      }
    });
  };

  // Load analysis history from database on component mount
  useEffect(() => {
    const loadAnalysisHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const historyData = await fetchAnalyses(20);
        setAnalyses(historyData);
      } catch (error) {
        console.error('Failed to load analysis history:', error);
        // Don't show error to user, just log it - app can still function
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadAnalysisHistory();
  }, []);

  const handleDeleteAnalysis = async (id: string) => {
    try {
      await analysisApi.deleteAnalysis({ id });
      // Remove from local state after successful deletion
      setAnalyses(analyses.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background image with AspectRatio */}
      <div className="fixed inset-0 w-full h-full z-0">
        <div className="w-full h-full overflow-hidden">
          <AspectRatio ratio={16 / 9} className="w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
              alt="Background"
              className="w-full h-full object-cover brightness-110 blur-lg"
              style={{ transform: 'scale(1.1)' }} // Ensures blur doesn't show edges
            />
          </AspectRatio>
        </div>
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="space-y-8">
            <StartExploringForm onAnalyze={handleAnalyze} loadingMessage={loadingMessage} />

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-black/10">
              <h2 className="text-xl font-semibold mb-4">Analysis History</h2>
              {isLoadingHistory ? (
                <p className="text-muted-foreground text-center py-8">Loading analysis history...</p>
              ) : (
                <AnalysisHistory
                  analyses={analyses}
                  onDeleteAnalysis={handleDeleteAnalysis}
                  darkMode={false}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
