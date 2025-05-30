import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DocumentUpload from "@/components/document-upload";
import JobDescriptionForm from "@/components/job-description-form";
import PipelineStatus from "@/components/pipeline-status";
import QualityMetrics from "@/components/quality-metrics";
import AgentStatus from "@/components/agent-status";
import ProcessingModal from "@/components/processing-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Shield, Star, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCoverLetterId, setCurrentCoverLetterId] = useState<number | null>(null);
  const { user, isDemoMode } = useAuth();

  const handleLogout = () => {
    if (isDemoMode) {
      localStorage.removeItem('demoMode');
      window.location.reload();
    } else {
      window.location.href = '/auth/logout';
    }
  };

  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
  });

  const { data: jobDescriptions } = useQuery({
    queryKey: ["/api/job-descriptions"],
  });

  const { data: coverLetters } = useQuery({
    queryKey: ["/api/cover-letters"],
  });

  const hasStyleGuide = documents?.some((doc: any) => doc.type === "style_guide");
  const hasResume = documents?.some((doc: any) => doc.type === "resume");
  const hasJobDescription = jobDescriptions?.length > 0;

  const canGenerate = hasStyleGuide && hasResume && hasJobDescription;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    try {
      setIsGenerating(true);
      const response = await fetch("/api/cover-letters/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescriptionId: jobDescriptions[0].id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start generation");
      }

      const result = await response.json();
      setCurrentCoverLetterId(result.coverLetterId);
    } catch (error) {
      console.error("Generation error:", error);
      setIsGenerating(false);
    }
  };

  const handleGenerationComplete = () => {
    setIsGenerating(false);
    setCurrentCoverLetterId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Cover Letter Generator</h1>
                <p className="text-sm text-secondary">Multi-Agent Pipeline System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-secondary">
                <Shield className="text-success w-4 h-4" />
                <span>ATS Optimized</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-secondary">
                <Star className="text-warning w-4 h-4" />
                <span>95%+ Quality</span>
              </div>
              
              {/* User Profile & Logout */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user?.firstName || 'Demo'} {user?.lastName || 'User'}</p>
                  <p className="text-xs text-secondary">{isDemoMode ? 'Demo Mode' : 'Authenticated'}</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pipeline Status */}
        <PipelineStatus />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Upload Section */}
            <DocumentUpload />

            {/* Job Description Input */}
            <JobDescriptionForm />

            {/* Generate Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Cover Letter
              </Button>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <QualityMetrics />
            <AgentStatus />

            {/* Recent Outputs */}
            <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-warning w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Outputs</h3>
                </div>

                <div className="space-y-3">
                  {coverLetters?.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No cover letters generated yet
                    </p>
                  ) : (
                    coverLetters?.map((letter: any) => (
                      <div 
                        key={letter.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="text-primary w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Cover Letter #{letter.id}
                            </p>
                            <p className="text-xs text-secondary">
                              {letter.qualityScore ? `${letter.qualityScore}% quality` : 'Processing...'}
                            </p>
                          </div>
                        </div>
                        {letter.qualityScore && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/api/cover-letters/${letter.id}/download?t=${Date.now()}`)}
                          >
                            Download
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Processing Modal */}
        {isGenerating && currentCoverLetterId && (
          <ProcessingModal 
            coverLetterId={currentCoverLetterId}
            onComplete={handleGenerationComplete}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">About the Pipeline</h4>
              <p className="text-sm text-secondary">
                Multi-agent AI system that creates ATS-optimized cover letters using your personal style guide and resume data.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quality Standards</h4>
              <ul className="text-sm text-secondary space-y-2">
                <li>• 95%+ Quality Score Target</li>
                <li>• ATS Keyword Optimization</li>
                <li>• Style Guide Compliance</li>
                <li>• Multi-stage Review Process</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Technical Details</h4>
              <ul className="text-sm text-secondary space-y-2">
                <li>• GPT-4o & Claude Integration</li>
                <li>• Replit-hosted Infrastructure</li>
                <li>• Document Export (.docx, Google Docs)</li>
                <li>• Continuous Learning System</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 mt-8 flex items-center justify-between">
            <p className="text-sm text-secondary">AI Cover Letter Generator Pipeline</p>
            <div className="flex items-center space-x-4 text-sm text-secondary">
              <span>Powered by Multi-Agent AI</span>
              <span>•</span>
              <span>Enterprise Grade</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
