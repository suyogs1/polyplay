// LLM integration for tutoring assistance

interface ExplainErrorParams {
  tone: 'kids' | 'pro';
  language: 'javascript' | 'python';
  challengeId: string;
  prompt: string;
  userCode: string;
  failed: { input: any[]; expected: any; got: any }[];
}

interface TutorResponse {
  why_it_failed: string;
  next_hint: string;
  fix_example: string;
}

/**
 * Mock error explanation for development mode
 */
function mockExplainError({ tone, language, userCode, failed }: ExplainErrorParams): TutorResponse {
  const isKidsMode = tone === 'kids';
  
  // Analyze common error patterns
  const code = userCode.toLowerCase();
  const hasFailures = failed.length > 0;
  
  // Common error patterns and responses
  if (!hasFailures) {
    return {
      why_it_failed: isKidsMode 
        ? "Great job! All tests are passing!"
        : "All test cases passed successfully.",
      next_hint: isKidsMode
        ? "You did it! Try the next challenge!"
        : "Consider optimizing your solution or trying a more complex challenge.",
      fix_example: language === 'python' ? "# Your code works perfectly!" : "// Your code works perfectly!"
    };
  }
  
  if (!code.includes('def solve') && !code.includes('function solve')) {
    return {
      why_it_failed: isKidsMode
        ? "I can't find a function called 'solve'! Every challenge needs this special function."
        : "The required 'solve' function is not defined in your code.",
      next_hint: isKidsMode
        ? "Start your code with the magic words that create the solve function!"
        : "Define a function named 'solve' that takes the required parameters.",
      fix_example: language === 'python' ? "def solve(nums):\n    # Your code here" : "function solve(nums) {\n  // Your code here\n}"
    };
  }
  
  if (code.includes('for') && !code.includes('return')) {
    return {
      why_it_failed: isKidsMode
        ? "You're doing great with the loop, but you forgot to give back an answer!"
        : "Your function contains a loop but doesn't return a value.",
      next_hint: isKidsMode
        ? "After your loop finishes, use the 'return' word to give back your answer."
        : "Add a return statement to provide the computed result.",
      fix_example: language === 'python' ? "return total" : "return total;"
    };
  }
  
  if (error.includes('indentation') || error.includes('indent')) {
    return {
      why_it_failed: isKidsMode
        ? "Python is picky about spaces! Your code lines need to be lined up just right."
        : "Python indentation error. Code blocks must be properly indented.",
      next_hint: isKidsMode
        ? "Make sure all the lines inside your function start with the same number of spaces."
        : "Use consistent indentation (4 spaces recommended) for code blocks.",
      fix_example: "def solve(nums):\n    total = 0  # 4 spaces\n    return total  # 4 spaces"
    };
  }
  
  if (code.includes('sum') && !code.includes('loop') && !code.includes('for')) {
    return {
      why_it_failed: isKidsMode
        ? "You're trying to add numbers, but you need to visit each number one by one!"
        : "To sum an array, you need to iterate through each element.",
      next_hint: isKidsMode
        ? "Try using a 'for' loop to look at each number in the list."
        : "Use a for loop to iterate through the array elements.",
      fix_example: language === 'python' 
        ? "for num in nums:\n    total += num" 
        : "for (let num of nums) {\n  total += num;\n}"
    };
  }
  
  // Generic syntax error
  if (error.includes('syntax')) {
    return {
      why_it_failed: isKidsMode
        ? "There's a small mistake in how you wrote your code. It's like a spelling error!"
        : "Syntax error detected. Check for missing punctuation or incorrect structure.",
      next_hint: isKidsMode
        ? "Look for missing commas, parentheses, or colons. Every piece of punctuation matters!"
        : "Review your code for missing semicolons, brackets, or other syntax elements.",
      fix_example: language === 'python' ? "def solve(nums):  # Don't forget the colon!" : "function solve(nums) {  // Don't forget the curly brace!"
    };
  }
  
  // Default response for unknown errors
  return {
    why_it_failed: isKidsMode
      ? "Something went wrong, but don't worry! Even the best programmers make mistakes."
      : "An error occurred during code execution. Review your logic and syntax.",
    next_hint: isKidsMode
      ? "Try reading your code out loud step by step. What should happen first?"
      : "Break down the problem into smaller steps and implement them one at a time.",
    fix_example: language === 'python' 
      ? "# Start simple:\ntotal = 0\nfor num in nums:\n    total += num\nreturn total"
      : "// Start simple:\nlet total = 0;\nfor (let num of nums) {\n  total += num;\n}\nreturn total;"
  };
}

/**
 * Main tutor API function
 */
export async function explainError(params: ExplainErrorParams): Promise<TutorResponse> {
  // Check if we're in live mode
  const tutorMode = import.meta.env.VITE_TUTOR_MODE;
  
  if (tutorMode === 'live') {
    // In live mode, make actual API call
    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'explain_error',
          payload: params
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Tutor API call failed:', error);
      // Fall back to mock response
      return mockExplainError(params);
    }
  } else {
    // Development mode - use mock responses
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    return mockExplainError(params);
  }
}

// Export types for use in other modules
export type { ExplainErrorParams, TutorResponse };