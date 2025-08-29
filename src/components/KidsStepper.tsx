import React, { useState, useCallback } from 'react';

interface VisualData {
  type: 'array' | 'string';
  initial: any;
  steps?: any[];
}

interface KidsStepperProps {
  pseudocode: string[];
  visual?: VisualData;
}

// State for the visual representation
interface VisualState {
  data: any;
  currentIndex: number;
  highlight: number[];
  variables: Record<string, any>;
}

const KidsStepper: React.FC<KidsStepperProps> = ({ 
  pseudocode, 
  visual
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visualState, setVisualState] = useState<VisualState>({
    data: visual?.initial || [],
    currentIndex: -1,
    highlight: [],
    variables: {}
  });

  const handleNextStep = useCallback(() => {
    if (currentStep >= pseudocode.length) return;

    const step = pseudocode[currentStep];
    const newStep = currentStep + 1;
    
    // Simple animations for sum-array and reverse-string
    if (visual?.type === 'array') {
      if (step.toLowerCase().includes('start with total')) {
        setVisualState(prev => ({
          ...prev,
          variables: { total: 0 },
          highlight: [],
          currentIndex: -1
        }));
      } else if (step.toLowerCase().includes('for each number')) {
        setVisualState(prev => ({
          ...prev,
          currentIndex: 0,
          highlight: [0]
        }));
      } else if (step.toLowerCase().includes('add it to total')) {
        setVisualState(prev => {
          if (Array.isArray(prev.data) && prev.currentIndex >= 0) {
            const newTotal = (prev.variables.total || 0) + prev.data[prev.currentIndex];
            const nextIndex = prev.currentIndex + 1;
            return {
              ...prev,
              variables: { ...prev.variables, total: newTotal },
              currentIndex: nextIndex < prev.data.length ? nextIndex : -1,
              highlight: nextIndex < prev.data.length ? [nextIndex] : []
            };
          }
          return prev;
        });
      }
    } else if (visual?.type === 'string') {
      if (step.toLowerCase().includes('reverse')) {
        setVisualState(prev => ({
          ...prev,
          currentIndex: 0,
          highlight: [0, prev.data.length - 1]
        }));
      } else if (step.toLowerCase().includes('swap')) {
        setVisualState(prev => {
          const str = String(prev.data);
          const left = prev.currentIndex;
          const right = str.length - 1 - left;
          return {
            ...prev,
            highlight: [left, right],
            currentIndex: left + 1
          };
        });
      }
    }

    setCurrentStep(newStep);
  }, [currentStep, pseudocode, visual]);

  const handleBackStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setVisualState({
      data: visual?.initial || [],
      currentIndex: -1,
      highlight: [],
      variables: {}
    });
  }, [visual]);

  // Render array visualization
  const renderArrayVisualization = () => {
    if (!visual || visual.type !== 'array' || !Array.isArray(visualState.data)) {
      return null;
    }

    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-700 mb-4">Array Visualization</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {visualState.data.map((item: any, index: number) => (
            <div
              key={index}
              className={`
                w-12 h-12 flex items-center justify-center rounded-lg border-2 font-bold text-lg
                transition-all duration-500 transform
                ${visualState.highlight.includes(index) 
                  ? 'bg-yellow-300 border-yellow-500 scale-110 shadow-lg' 
                  : 'bg-blue-100 border-blue-300'
                }
              `}
            >
              {item}
            </div>
          ))}
        </div>
        
        {/* Variables display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Variables:</h4>
          <div className="space-y-2">
            {Object.entries(visualState.variables).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="font-mono text-sm text-gray-600">{key}:</span>
                <span className="font-mono text-lg font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render string visualization
  const renderStringVisualization = () => {
    if (!visual || visual.type !== 'string') {
      return null;
    }

    const stringData = String(visualState.data);
    
    return (
      <div className="bg-white border-2 border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-700 mb-4">String Visualization</h3>
        <div className="flex flex-wrap gap-1 mb-4">
          {stringData.split('').map((char: string, index: number) => (
            <div
              key={index}
              className={`
                w-8 h-8 flex items-center justify-center rounded border-2 font-mono text-sm
                transition-all duration-500 transform
                ${visualState.highlight.includes(index) 
                  ? 'bg-green-300 border-green-500 scale-110 shadow-lg' 
                  : 'bg-green-100 border-green-300'
                }
              `}
            >
              {char === ' ' ? '␣' : char}
            </div>
          ))}
        </div>
        
        {/* Variables display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Variables:</h4>
          <div className="space-y-2">
            {Object.entries(visualState.variables).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="font-mono text-sm text-gray-600">{key}:</span>
                <span className="font-mono text-lg font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-purple-700 mb-2">Kids Mode - Step by Step</h2>
        <p className="text-gray-600">Follow along as we solve the problem together!</p>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-purple-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / pseudocode.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6 flex-1">
        {/* Pseudocode Steps */}
        <div className="flex-1">
          <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-purple-700 mb-4">Steps to Follow</h3>
            <div className="space-y-3">
              {pseudocode.map((step, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-300
                    ${index === currentStep - 1
                      ? 'bg-purple-100 border-purple-400 shadow-md transform scale-105'
                      : index < currentStep
                      ? 'bg-green-50 border-green-300 opacity-75'
                      : 'bg-gray-50 border-gray-200 opacity-50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === currentStep - 1
                        ? 'bg-purple-500 text-white'
                        : index < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                      }
                    `}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className={`
                      text-lg
                      ${index === currentStep - 1 ? 'font-semibold text-purple-800' : ''}
                    `}>
                      {step}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div className="flex-1">
          {visual?.type === 'array' && renderArrayVisualization()}
          {visual?.type === 'string' && renderStringVisualization()}
          
          {!visual && (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
              <div className="text-gray-400 text-lg">
                No visualization available for this challenge
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
        >
          Reset
        </button>
        <button
          onClick={handleBackStep}
          disabled={currentStep === 0}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          Back
        </button>
        <button
          onClick={handleNextStep}
          disabled={currentStep >= pseudocode.length}
          className="px-8 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
        >
          {currentStep >= pseudocode.length ? '🎉 Complete!' : 'Next Step'}
        </button>
      </div>

      {/* Switch to Pro Mode */}
      <div className="text-center">
        <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-semibold">
          Switch to Pro Mode to try the real code! 💻
        </button>
      </div>
    </div>
  );
};

export default KidsStepper;