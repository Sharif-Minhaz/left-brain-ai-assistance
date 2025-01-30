"use client";

import { postMessage } from "@/lib/actions/ollama";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Bot, ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

export default function StreamingChat() {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasInteracted, setHasInteracted] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		setIsLoading(true);
		setHasInteracted(true);
		setMessages((prev) => [...prev, { role: "user", content: input }]);
		setInput("");

		try {
			const stream = await postMessage(input);
			if (!stream) throw new Error("No response from server");

			const reader = stream.getReader();
			let fullResponse = "";

			// Add an empty assistant message for streaming content
			setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				fullResponse += value;

				// Update last assistant message dynamically
				setMessages((prev) => {
					const lastMessage = prev[prev.length - 1];
					if (lastMessage.role === "assistant") {
						lastMessage.content = fullResponse;
						return [...prev];
					}
					return [...prev, { role: "assistant", content: fullResponse }];
				});
			}
		} catch (error) {
			console.error("Stream error:", error);
			setMessages((prev) => [
				...prev,
				{ role: "assistant", content: "Error occurred during streaming" },
			]);
		} finally {
			setIsLoading(false);
			setInput("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<div className="flex flex-col h-screen max-w-4xl mx-auto p-4 bg-gray-50 dark:bg-gray-900">
			<Card
				className={`flex-grow overflow-hidden h-full mb-4 border-0 shadow-lg bg-white dark:bg-gray-800`}
			>
				<CardContent className="h-full p-0">
					<ScrollArea className="h-full flex items-center">
						{messages.length === 0 ? (
							<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
								<p>Start a conversation by typing a message below.</p>
							</div>
						) : (
							messages.map((message, index) => (
								<div
									key={index}
									className={`p-4 ${
										message.role === "user"
											? "bg-blue-50 dark:bg-blue-900"
											: "bg-gray-50 dark:bg-gray-800"
									}`}
								>
									<div className="flex items-start max-w-3xl mx-auto">
										<div
											className={`flex-shrink-0 mr-4 ${
												message.role === "user" ? "order-2 ml-4 mr-0" : ""
											}`}
										>
											{message.role === "user" ? (
												<User className="w-6 h-6 text-blue-500" />
											) : (
												<Bot className="w-6 h-6 text-green-500" />
											)}
										</div>
										<div
											className={`flex-grow ${
												message.role === "user" ? "text-right" : "text-left"
											}`}
										>
											<ReactMarkdown
												remarkPlugins={[remarkGfm]}
												rehypePlugins={[rehypeHighlight]}
												className="prose dark:prose-invert max-w-none"
											>
												{message.content}
											</ReactMarkdown>
										</div>
									</div>
								</div>
							))
						)}
						<div ref={messagesEndRef} />
					</ScrollArea>
				</CardContent>
			</Card>
			<form
				onSubmit={handleSubmit}
				className={`${
					hasInteracted ? "sticky bottom-0 bg-gray-50 dark:bg-gray-900 pt-2" : "mt-auto"
				}`}
			>
				<div className="flex items-end space-x-2 relative">
					<Textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your message..."
						className="rounded-[12px] flex-grow resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
						rows={1}
						style={{ minHeight: "5rem", maxHeight: "10rem" }}
					/>
					<Button
						type="submit"
						disabled={isLoading || input === ""}
						className="bg-blue-500 size-8 rounded-full hover:bg-blue-600 text-white absolute right-2 bottom-2"
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<ArrowUp className="h-4 w-4" />
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
