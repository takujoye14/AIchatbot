import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            // If it has class with language- or has newlines, it's a code block
            const isBlock = className && (match || codeString.includes("\n"));

            if (isBlock) {
              const language = match ? match[1] : "code";
              return <CodeBlock code={codeString} language={language} />;
            }
            
            return (
              <code
                className="bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs px-1.5 py-0.5 rounded font-medium border border-gray-200/50 dark:border-gray-700/50"
                {...props}
              >
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code block:", err);
    }
  };

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-950 text-gray-100 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-gray-400 select-none">
        <span className="uppercase text-[10px] font-bold tracking-wider text-indigo-400">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-gray-800 hover:text-gray-100 transition-all focus:outline-none cursor-pointer"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span className="text-[11px] font-medium">Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="!m-0 !p-0 bg-transparent text-gray-100 font-mono leading-relaxed select-text whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
