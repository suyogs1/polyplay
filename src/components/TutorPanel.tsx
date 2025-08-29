import React, { useState, useCallback } from 'react';
import { explainError } from '../api/tutor';

interface TutorPanelProps {
  tone: 'kids' | 'pro';
  language: 'javascript' | 'python';
  challengeId: string;
  prompt: string;
  userCode: string;
  failed: { input: any[]; expected: any; got: any }[];
}

interface TutorResponse {
  why_it_failed?: string;
  next_hint?: string;
  fix_example?: string;
}

const TutorPanel: React.FC<TutorPanelProps> = ({
  tone,
  language,
  challengeId,
  prompt,
  userCode,
  failed
}) => {
  const [tutorResponse, setTutorResponse] = useState<TutorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isKidsMode = tone === 'kids';

  const handleGetExplanation = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await explainError({
        tone,
        language,
        challengeId,
        prompt,
        userCode,
        failed
      });
      setTutorResponse(response);
    } catch (err) {
      console.error('Failed to get tutor explanation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tone, language, challengeId, prompt, userCode, failed]);

  if (failed.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-indigo-200 rounded-lg shadow-lg">
      {/* Header */}
      <div className={`px-4 py-3 rounded-t-lg cursor-pointer ${
        isKidsMode ? 'bg-purple-100 border-b border-purple-200' : 'bg-indigo-100 border-b border-indigo-200'
      }`} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🤖</div>
            <h3 className={`font-semibold ${
              isKidsMode ? 'text-purple-700' : 'text-indigo-700'
            }`}>
              {isKidsMode ? 'Need Help?' : 'AI Tutor'}
            </h3>
          </div>
          <div className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Action button */}
          <div className="flex justify-center">
            <button
              onClick={handleGetExplanation}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isKidsMode
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? '🤔 Thinking...' : isKidsMode ? '🔍 What went wrong?' : 'Explain Error'}
            </button>
          </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">
              {isKidsMode ? 'Let me think about this...' : 'Analyzing your code...'}
            </span>
          </div>
        )}

        {/* Tutor response */}
        {tutorResponse && !isLoading && (
          <div className={`rounded-lg p-4 space-y-3 ${
            isKidsMode ? 'bg-purple-50 border border-purple-200' : 'bg-indigo-50 border border-indigo-200'
          }`}>
            {/* Why it failed */}
            {tutorResponse.why_it_failed && (
              <div>
                <h4 className={`font-semibold mb-2 ${
                  isKidsMode ? 'text-purple-700' : 'text-indigo-700'
                }`}>
                  {isKidsMode ? '🤔 What happened:' : 'Issue Identified:'}
                </h4>
                <p className={`${
                  isKidsMode ? 'text-purple-800 text-lg' : 'text-indigo-800'
                }`}>
                  {tutorResponse.why_it_failed}
                </p>
              </div>
            )}

            {/* Next hint */}
            {tutorResponse.next_hint && (
              <div>
                <h4 className={`font-semibold mb-2 ${
                  isKidsMode ? 'text-green-700' : 'text-emerald-700'
                }`}>
                  {isKidsMode ? '💡 Try this:' : 'Suggestion:'}
                </h4>
                <p className={`${
                  isKidsMode ? 'text-green-800 text-lg' : 'text-emerald-800'
                }`}>
                  {tutorResponse.next_hint}
                </p>
              </div>
            )}

            {/* Fix example */}
            {tutorResponse.fix_example && (
              <div>
                <h4 className={`font-semibold mb-2 ${
                  isKidsMode ? 'text-blue-700' : 'text-blue-700'
                }`}>
                  {isKidsMode ? '✨ Example:' : 'Code Example:'}
                </h4>
                <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
                  <pre>{tutorResponse.fix_example}</pre>
                </div>
              </div>
            )}

            {/* General message */}
            {tutorResponse.message && !tutorResponse.why_it_failed && (
              <div>
                <p className={`${
                  isKidsMode ? 'text-purple-800 text-lg' : 'text-indigo-800'
                }`}>
                  {tutorResponse.message}
                </p>
              </div>
            )}

            {/* Suggestions */}
            {tutorResponse.suggestions && tutorResponse.suggestions.length > 0 && (
              <div>
                <h4 className={`font-semibold mb-2 ${
                  isKidsMode ? 'text-orange-700' : 'text-orange-700'
                }`}>
                  {isKidsMode ? '🎯 More ideas:' : 'Additional Suggestions:'}
                </h4>
                <ul className="space-y-1">
                  {tutorResponse.suggestions.map((suggestion, index) => (
                    <li key={index} className={`flex items-start space-x-2 ${
                      isKidsMode ? 'text-orange-800' : 'text-orange-800'
                    }`}>
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next hint availability */}
            {tutorResponse.nextHintAvailable && (
              <div className={`text-sm ${
                isKidsMode ? 'text-purple-600' : 'text-indigo-600'
              }`}>
                {isKidsMode ? '🌟 More hints available! Click the hint button again.' : 'Additional hints available at the next level.'}
              </div>
            )}
          </div>
        )}

          {/* Empty state */}
          {!tutorResponse && !isLoading && (
            <div className="text-center py-4 text-gray-500">
              <div className="text-2xl mb-2">🤖</div>
              <p className={isKidsMode ? 'text-base' : 'text-sm'}>
                {isKidsMode 
                  ? "I can help explain what went wrong!" 
                  : "Get AI assistance with your code errors."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TutorPanel;