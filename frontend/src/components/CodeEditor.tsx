import React, { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useWebSocket } from '../hooks/useWebSocket';
import { Breakpoint, EditorError } from '../types';

interface CodeEditorProps {
  height?: string | number;
  theme?: 'light' | 'dark';
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

const LowLogicMonacoTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955' },
    { token: 'keyword', foreground: '569CD6' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'type.identifier', foreground: '4EC9B0' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'operator', foreground: 'D4D4D4' },
    { token: 'delimiter', foreground: 'D4D4D4' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#2D2D30',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editorCursor.foreground': '#AEAFAD',
    'editorWhitespace.foreground': '#404040',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#C6C6C6',
  },
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  height = '100%',
  theme = 'dark',
  onMount,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationRef = useRef<string[]>([]);

  const { state, actions } = useWebSocket();

  // Define LowLogic language
  const defineLowLogicLanguage = useCallback((monaco: any) => {
    // Register LowLogic language
    monaco.languages.register({ id: 'lowlogic' });

    // Define language tokens
    monaco.languages.setMonarchTokensProvider('lowlogic', {
      // Keywords
      keywords: [
        'int', 'float', 'char', 'bool', 'string', 'ptr',
        'struct', 'class', 'template', 'typename',
        'public', 'private',
        'if', 'else', 'while', 'for', 'break', 'continue', 'return',
        'new', 'delete', 'null', 'true', 'false'
      ],

      // Operators
      operators: [
        '=', '+', '-', '*', '/', '%',
        '==', '!=', '<', '>', '<=', '>=',
        '&&', '||', '!',
        '&', '*', '->', '.',
        '++', '--', '+=', '-=', '*=', '/='
      ],

      // Symbols
      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      // Token patterns
      tokenizer: {
        root: [
          // Comments
          [/[ \t\r\n]+/, 'white'],
          [//.*$/, 'comment'],
          [/\/*/, 'comment', '@comment'],

          // Strings and characters
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'[^\\']'/, 'string'],
          [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],

          // Keywords
          [
            /[a-zA-Z_]\w*/,
            {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier'
              }
            }
          ],

          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],

          // Other
          [/[;,]/, 'delimiter'],
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        string: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
      },
    });

    // Set language configuration
    monaco.languages.setLanguageConfiguration('lowlogic', {
      comments: {
        blockComment: ['/*', '*/'],
        lineComment: '//'
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ]
    });
  }, []);

  // Update decorations (current line, breakpoints, errors)
  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const editor = editorRef.current;
    const decorations: editor.IModelDeltaDecoration[] = [];

    // Current line highlight
    if (state.editor.currentLine > 0) {
      decorations.push({
        range: new monaco.Range(
          state.editor.currentLine,
          1,
          state.editor.currentLine,
          1
        ),
        options: {
          isWholeLine: true,
          className: 'current-line-highlight',
          glyphMarginClassName: 'current-line-glyph'
        }
      });
    }

    // Breakpoints
    state.editor.breakpoints.forEach(breakpoint => {
      decorations.push({
        range: new monaco.Range(breakpoint.line, 1, breakpoint.line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: breakpoint.enabled ? 'breakpoint-glyph' : 'breakpoint-disabled-glyph'
        }
      });
    });

    // Errors
    state.editor.errors.forEach(error => {
      decorations.push({
        range: new monaco.Range(error.line, error.column, error.line, error.column + 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'error-glyph',
          hoverMessage: { value: error.message }
        }
      });
    });

    decorationRef.current = editor.deltaDecorations(decorationRef.current, decorations);
  }, [state.editor.currentLine, state.editor.breakpoints, state.editor.errors]);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define LowLogic language
    defineLowLogicLanguage(monaco);

    // Apply theme
    monaco.editor.defineTheme('lowlogic-dark', LowLogicMonacoTheme);
    monaco.editor.setTheme('lowlogic-dark');

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // Event handlers
    editor.onDidChangeCursorPosition((e) => {
      actions.setCursor({
        line: e.position.lineNumber,
        column: e.position.column
      });
    });

    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position.lineNumber;
        actions.toggleBreakpoint(line);
      }
    });

    // Change handler
    editor.onDidChangeModelContent(() => {
      const code = editor.getValue();
      actions.clearErrors();
      actions.parseCode(code);
    });

    // Initial code parse
    const code = editor.getValue();
    actions.parseCode(code);

    // Update decorations
    updateDecorations();

    if (onMount) {
      onMount(editor);
    }
  }, [defineLowLogicLanguage, actions, updateDecorations, onMount]);

  // Update decorations when state changes
  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  // Update editor value when code changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== state.editor.code) {
      editorRef.current.setValue(state.editor.code);
    }
  }, [state.editor.code]);

  // Add custom styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .current-line-highlight {
        background-color: rgba(255, 255, 0, 0.1);
        border-left: 3px solid #ffff00;
      }
      .current-line-glyph {
        background-color: #ffff00;
        width: 3px !important;
      }
      .breakpoint-glyph {
        background-color: #e74c3c;
        border-radius: 50%;
        width: 8px !important;
        height: 8px !important;
        margin: 2px;
      }
      .breakpoint-disabled-glyph {
        background-color: #95a5a6;
        border-radius: 50%;
        width: 8px !important;
        height: 8px !important;
        margin: 2px;
      }
      .error-glyph {
        background-color: #e74c3c;
        width: 8px !important;
        height: 8px !important;
        margin: 2px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="code-editor" style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage="lowlogic"
        defaultValue={state.editor.code}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          glyphMargin: true,
          lineNumbersMinChars: 3,
          showFoldingControls: 'always',
          smoothScrolling: true,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          suggest: {
            showKeywords: true,
            showSnippets: true
          }
        }}
      />
    </div>
  );
};