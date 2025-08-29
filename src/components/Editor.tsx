import React, { useEffect, useRef, useState } from 'react';

interface EditorProps {
  code: string;
  language: 'javascript' | 'python';
  onChange: (value: string) => void;
  onRun: () => void;
  running: boolean;
}

const Editor: React.FC<EditorProps> = ({ code, language, onChange, onRun, running }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMonaco = async () => {
      try {
        const monacoModule = await import('monaco-editor');
        
        if (!isMounted) return;

        // Configure Monaco
        monacoModule.editor.defineTheme('playground-theme', {
          base: 'vs',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': '#fafafa',
            'editor.lineHighlightBackground': '#f0f9ff',
          }
        });

        setMonaco(monacoModule);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load Monaco:', error);
        setLoading(false);
      }
    };

    loadMonaco();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!monaco || !editorRef.current || editor) return;

    const newEditor = monaco.editor.create(editorRef.current, {
      value: code,
      language: language === 'javascript' ? 'javascript' : 'python',
      theme: 'playground-theme',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      automaticLayout: true,
      wordWrap: 'on',
      tabSize: language === 'python' ? 4 : 2,
      insertSpaces: true,
    });

    newEditor.onDidChangeModelContent(() => {
      onChange(newEditor.getValue());
    });

    // Add Ctrl+Enter / Cmd+Enter to run
    newEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (!running) {
        onRun();
      }
    });

    setEditor(newEditor);

    return () => {
      newEditor.dispose();
    };
  }, [monaco, code, language, onChange, onRun, running]);

  useEffect(() => {
    if (editor && editor.getValue() !== code) {
      editor.setValue(code);
    }
  }, [editor, code]);

  useEffect(() => {
    if (editor) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language === 'javascript' ? 'javascript' : 'python');
      }
    }
  }, [editor, language, monaco]);

  if (loading) {
    return (
      <div className="h-full bg-gray-50 border border-gray-300 rounded-md flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-600">Loading editor...</div>
        </div>
      </div>
    );
  }

  if (!monaco) {
    return (
      <div className="h-full bg-gray-50 border border-gray-300 rounded-md flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="mb-2">⚠️</div>
          <div>Failed to load editor</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b border-gray-300 rounded-t-md">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {language === 'javascript' ? 'JavaScript' : 'Python'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            language === 'javascript' ? 'bg-yellow-500' : 'bg-blue-500'
          }`}></div>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            running
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {running ? 'Running...' : 'Run'}
        </button>
      </div>
      <div ref={editorRef} className="flex-1 border border-gray-300 rounded-b-md" />
    </div>
  );
};

export default Editor;