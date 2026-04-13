'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';

interface TermsContentRendererProps {
  content: string;
  className?: string;
}

export default function TermsContentRenderer({ content, className = '' }: TermsContentRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-semibold mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mb-2">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
              {children}
            </a>
          ),
          code: ({ children }) => <code className="rounded bg-gray-100 px-1 py-0.5">{children}</code>,
          pre: ({ children }) => <pre className="overflow-x-auto rounded bg-gray-100 p-3 mb-4">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-200 pl-3 italic mb-4">{children}</blockquote>,
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}