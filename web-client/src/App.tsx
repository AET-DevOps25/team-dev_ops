import Header from './components/Header';
import StartExploringForm from './components/StartExploringForm';
import AnalysisHistory from './components/AnalysisHistory';
import { AspectRatio } from "./components/ui/aspect-ratio";
import { AnalyzeRequest } from "@/api/client";
import { useStartAnalysis } from "@/hooks/useStartAnalysis";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";

function App() {
  const { analyses, isLoading: isLoadingHistory, refresh, remove } = useAnalysisHistory(20);
  const { startAnalysis, loadingMessage } = useStartAnalysis({ onFinished: refresh });

  const handleAnalyze = async (req: AnalyzeRequest) => {
    await startAnalysis(req);
  };

  const handleDeleteAnalysis = async (id: string) => {
    await remove(id);
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
