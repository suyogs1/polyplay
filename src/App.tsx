import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import TestPanel from './components/TestPanel';
import KidsStepper from './components/KidsStepper';
import AsmRunner from './components/AsmRunner';
import TutorPanel from './components/TutorPanel';
import { runJs } from './runners/jsRunner';
import { runPy } from './runners/pyRunner';
import { triggerConfetti } from './utils/confetti';
import { incrementStreak, getStreak, saveChallengeResult, awardBadge, wasTutorUsed, markTutorUsed } from './state/progress';

interface Challenge {
  id: string;
  title: string;
  prompt: string;
  signature: {
    python: string;
    javascript: string;
  };
  starter: {
    python: string;
    javascript: string;
  };
  tests: { input: any[]; output: any }[];
  kids_pseudocode: string[];
  visual?: {
    type: 'array' | 'string';
    initial: any;
  };
  explain: string;
}

interface TestResult {
  ok: boolean;
  expected: any;
  got: any;
  error?: string;
}

type TabType = 'kids' | 'pro' | 'assembler' | 'results';
type Language = 'javascript' | 'python';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('pro');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [streak, setStreak] = useState(0);

  const currentChallenge = challenges[currentChallengeIndex];
  const disablePython = (import.meta as any).env?.VITE_DISABLE_PY === '1';
  const disableAsm = (import.meta as any).env?.VITE_DISABLE_ASM === '1';

  // Load challenges
  useEffect(() => {
    fetch('/challenges.json')
      .then(res => res.json())
      .then(data => {
        setChallenges(data);
        if (data.length > 0) {
          setCode(data[0].starter.javascript);
        }
      })
      .catch(err => {
        console.error('Failed to load challenges:', err);
        // Fallback to a simple challenge
        const fallback: Challenge = {
          id: 'sum-array',
          title: 'Sum the Numbers',
          prompt: 'Return the sum of all numbers in the array.',
          signature: {
            python: 'def solve(nums):',
            javascript: 'function solve(nums) {'
          },
          starter: {
            python: 'def solve(nums):\n    # TODO\n    return 0',
            javascript: 'function solve(nums) {\n  // TODO\n  return 0;\n}'
          },
          tests: [
            { input: [[1, 2, 3]], output: 6 },
            { input: [[]], output: 0 }
          ],
          kids_pseudocode: [
            'Start with total = 0',
            'For each number in the list, add it to total',
            'Return total'
          ],
          visual: {
            type: 'array',
            initial: [1, 2, 3]
          },
          explain: 'Use a loop and accumulator; O(n).'
        };
        setChallenges([fallback]);
        setCode(fallback.starter.javascript);
      });
  }, []);

  // Update streak on load
  useEffect(() => {
    setStreak(getStreak());
  }, []);

  // Update code when challenge or language changes
  useEffect(() => {
    if (currentChallenge) {
      setCode(currentChallenge.starter[currentLanguage]);
      setTestResults([]);
    }
  }, [currentChallenge, currentLanguage]);

  const handleRun = async () => {
    if (!currentChallenge || isRunning) return;

    setIsRunning(true);
    setTestResults([]);

    try {
      let results: TestResult[];

      if (currentLanguage === 'javascript') {
        const jsResult = await runJs(code, currentChallenge.tests);
        results = jsResult.results;
        
        if (jsResult.timeout) {
          results = [{
            ok: false,
            expected: 'completion',
            got: 'timeout',
            error: 'Code execution timed out after 1 second'
          }];
        }
      } else {
        // Python
        const pyResult = await runPy(code, currentChallenge.tests);
        results = pyResult.results;
        
        if (pyResult.timeout) {
          results = [{
            ok: false,
            expected: 'completion',
            got: 'timeout',
            error: 'Code execution timed out after 2 seconds'
          }];
        }
      }

      setTestResults(results);

      // Check if all tests passed
      const allPassed = results.length > 0 && results.every(r => r.ok);
      
      if (allPassed) {
        // Trigger confetti
        triggerConfetti();
        
        // Update progress
        incrementStreak();
        setStreak(getStreak());
        saveChallengeResult(currentChallenge.id, currentLanguage === 'javascript' ? 'js' : 'py', true);
        
        // Award debug detective badge if tutor was used
        if (wasTutorUsed(currentChallenge.id)) {
          awardBadge('debug_detective');
        }
      } else {
        saveChallengeResult(currentChallenge.id, currentLanguage === 'javascript' ? 'js' : 'py', false);
      }

    } catch (error) {
      setTestResults([{
        ok: false,
        expected: 'valid execution',
        got: 'error',
        error: error instanceof Error ? error.message : String(error)
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTutorUsed = () => {
    if (currentChallenge) {
      markTutorUsed(currentChallenge.id);
    }
  };

  const failedTests = testResults.filter(r => !r.ok).map(r => ({
    input: [],
    expected: r.expected,
    got: r.got
  }));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'kids':
        return currentChallenge ? (
          <KidsStepper
            pseudocode={currentChallenge.kids_pseudocode}
            visual={currentChallenge.visual}
          />
        ) : null;

      case 'pro':
        return currentChallenge ? (
          <div className="h-full flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-4">
              {/* Challenge info */}
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{currentChallenge.title}</h2>
                <p className="text-gray-600 mb-4">{currentChallenge.prompt}</p>
                
                {/* Language tabs */}
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => setCurrentLanguage('javascript')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentLanguage === 'javascript'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    JavaScript
                  </button>
                  {!disablePython && (
                    <button
                      onClick={() => setCurrentLanguage('python')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentLanguage === 'python'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Python
                    </button>
                  )}
                </div>

                {/* Challenge navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentChallengeIndex(Math.max(0, currentChallengeIndex - 1))}
                      disabled={currentChallengeIndex === 0}
                      className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentChallengeIndex(Math.min(challenges.length - 1, currentChallengeIndex + 1))}
                      disabled={currentChallengeIndex === challenges.length - 1}
                      className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {currentChallengeIndex + 1} of {challenges.length}
                  </span>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1">
                <Editor
                  code={code}
                  language={currentLanguage}
                  onChange={setCode}
                  onRun={handleRun}
                  running={isRunning}
                />
              </div>
            </div>

            <div className="w-full lg:w-96 flex flex-col gap-4">
              {/* Test Panel */}
              <div className="flex-1">
                <TestPanel
                  tests={currentChallenge.tests}
                  results={testResults}
                />
              </div>

              {/* Tutor Panel */}
              {failedTests.length > 0 && (
                <div onClick={handleTutorUsed}>
                  <TutorPanel
                    tone="pro"
                    language={currentLanguage}
                    challengeId={currentChallenge.id}
                    prompt={currentChallenge.prompt}
                    userCode={code}
                    failed={failedTests}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null;

      case 'assembler':
        return <AsmRunner />;

      case 'results':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Progress</h2>
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-xl font-semibold text-gray-700">
                Current Streak: {streak} days
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Polyglot Playground</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Streak: {streak} 🔥</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-300 px-6">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('kids')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'kids'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Kids Mode
          </button>
          <button
            onClick={() => setActiveTab('pro')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'pro'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Pro Mode
          </button>
          {!disableAsm && (
            <button
              onClick={() => setActiveTab('assembler')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'assembler'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Assembler
            </button>
          )}
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'results'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Progress
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;