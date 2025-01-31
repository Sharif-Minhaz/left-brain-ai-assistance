import { Copy } from "lucide-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.min.css";
import { Children, useState } from "react";

export default function MarkdownViewer({ content }: { content: string }) {
	const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

	// Function to handle copy action per block
	const handleCopy = (key: string) => {
		setCopiedMap((prev) => ({ ...prev, [key]: true }));
		setTimeout(() => {
			setCopiedMap((prev) => ({ ...prev, [key]: false }));
		}, 2000);
	};

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeHighlight]}
			components={{
				code({ node, inline, className, children, ...props }) {
					const match = /language-(\w+)/.exec(className || "");
					const language = match ? match[1] : "plaintext";
					const text = Children.toArray(children).join("");
					const key = text.substring(0, 10);

					return !inline ? (
						<div className="relative group">
							{/* Language Label */}
							<div className="absolute top-2 right-10 bg-gray-800 text-white text-xs px-2 py-1 rounded">
								{language}
							</div>

							{/* Copy Button */}
							<CopyToClipboard text={text} onCopy={() => handleCopy(key)}>
								<button className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded hover:bg-gray-600">
									{copiedMap[key] ? "Copied!" : <Copy size={14} />}
								</button>
							</CopyToClipboard>

							{/* Code Block */}
							<pre
								className={`rounded-lg overflow-x-auto ${className || ""}`}
								{...props}
							>
								<code>{children}</code>
							</pre>
						</div>
					) : (
						<code className={className} {...props}>
							{children}
						</code>
					);
				},
			}}
			className="prose dark:prose-invert !max-w-full w-full break-words overflow-x-auto"
		>
			{content}
		</ReactMarkdown>
	);
}
