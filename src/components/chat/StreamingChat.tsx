"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Bot, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Intro from "./Intro";
import MarkdownViewer from "./MarkdownViewer";
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "@/configs";

export default function StreamingChat() {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasInteracted, setHasInteracted] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [controller, setController] = useState<AbortController | null>(null);
	const [manualScrolled, setManualScrolled] = useState(false);
	const [messageHistory, setMessageHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState<number | null>(null);

	useEffect(() => {
		if (!manualScrolled) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, manualScrolled]);

	const handleWheel = (event: WheelEvent) => {
		if (event.deltaY < 0) {
			setManualScrolled(true);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		setIsLoading(true);
		setHasInteracted(true);
		setMessages((prev) => [...prev, { role: "user", content: input }]);
		setInput("");
		setManualScrolled(false);

		// Create a new AbortController for this request.
		const newController = new AbortController();
		setController(newController);

		window.addEventListener("wheel", handleWheel, { passive: true });

		try {
			// Directly call the Ollama API endpoint.
			const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: OLLAMA_MODEL,
					prompt: input,
					stream: true,
				}),
				signal: newController.signal,
			});

			if (!res.body) throw new Error("No response from server");

			// Prepare to read the streamed response.
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let fullResponse = "";
			let buffer = "";

			// Add an empty assistant message for streaming content.
			setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				if (newController.signal.aborted) {
					console.log("Streaming aborted by user.");
					break;
				}

				// Decode the incoming chunk.
				const decodedChunk = decoder.decode(value, { stream: true });
				buffer += decodedChunk;

				// Ollama returns newline-delimited JSON. Process complete lines.
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // Save any partial line for the next chunk.

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const json = JSON.parse(line);
						if (json.response) {
							// Append the new piece of response.
							fullResponse += json.response;
							// Update the UI with the latest fullResponse.
							setMessages((prev) => {
								const lastMessage = prev[prev.length - 1];
								if (lastMessage.role === "assistant") {
									lastMessage.content = fullResponse;
									return [...prev];
								}
								return [...prev, { role: "assistant", content: fullResponse }];
							});
						}
					} catch (err) {
						console.error("JSON parse error:", err);
					}
				}
			}
		} catch (error: unknown) {
			if ((error as Error).name === "AbortError") {
				console.log("User stopped streaming.");
			} else {
				console.error("Stream error:", error);
				setMessages((prev) => [
					...prev,
					{ role: "assistant", content: "Error occurred during streaming" },
				]);
			}
		} finally {
			setIsLoading(false);
			setInput("");
			setManualScrolled(false);
			window.removeEventListener("wheel", handleWheel);
		}
	};

	const handleStop = () => {
		if (controller) {
			controller.abort();
			setController(null);
			setIsLoading(false);
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = textareaRef.current;
		const cursorPosition = textarea?.selectionStart || 0;
		const lines = input.split("\n");
		const currentLineIndex = input.substring(0, cursorPosition).split("\n").length - 1;

		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			if (input.trim() !== "") {
				setMessageHistory((prev: string[]) => [...prev, input]);
				handleSubmit(event);
				setInput("");
				setHistoryIndex(null);
			}
		} else if (event.key === "ArrowUp") {
			if (currentLineIndex === 0 && messageHistory.length > 0) {
				setHistoryIndex((prev) => {
					const newIndex =
						prev === null ? messageHistory.length - 1 : Math.max(prev - 1, 0);
					setInput(messageHistory[newIndex]);
					return newIndex;
				});
			}
		} else if (event.key === "ArrowDown") {
			if (currentLineIndex === lines.length - 1 && historyIndex !== null) {
				setHistoryIndex((prev) => {
					const newIndex = prev === messageHistory.length - 1 ? null : prev! + 1;
					setInput(newIndex === null ? "" : messageHistory[newIndex]);
					return newIndex;
				});
			}
		}
	};

	return (
		<div
			className={cn(
				"flex flex-col h-screen max-w-4xl mx-auto p-4 bg-gray-50 dark:bg-gray-900",
				!hasInteracted && "justify-center items-center"
			)}
		>
			<Card
				className={cn(
					`flex-grow overflow-hidden h-full mb-4 border-0 shadow-lg bg-white dark:bg-gray-800`,
					!hasInteracted && "hidden"
				)}
			>
				<CardContent className="h-full p-0">
					<ScrollArea className="h-full flex items-center">
						{messages.map((message, index) => (
							<div
								key={index}
								className={cn(
									"p-4 bg-gray-50 dark:bg-gray-800",
									message.role === "user" && "bg-blue-50 dark:bg-blue-900"
								)}
							>
								<div className="flex items-start max-w-3xl mx-auto">
									<div
										className={`flex-shrink-0 mr-4 ${
											message.role === "user" ? "order-2 ml-4 mr-0" : ""
										}`}
									>
										{message.role === "user" ? (
											<div className="border flex items-center justify-center w-10 h-10 bg-white rounded-full">
												<User className="w-6 h-6 text-blue-500" />
											</div>
										) : (
											<div className="border flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
												<Bot className="w-6 h-6 text-blue-600" />
											</div>
										)}
									</div>
									<div
										className={cn(
											"flex-grow w-full",
											message.role === "user"
												? "justify-end text-ellipsis overflow-hidden"
												: "pr-[20px]"
										)}
									>
										{message.role === "assistant" ? (
											<MarkdownViewer content={message.content} />
										) : (
											<div className="w-fit mt-2 break-words overflow-hidden text-ellipsis whitespace-pre-wrap ml-auto">
												{message.content}
											</div>
										)}
									</div>
								</div>
							</div>
						))}
						<div ref={messagesEndRef} />
					</ScrollArea>
				</CardContent>
			</Card>

			{!hasInteracted && <Intro />}

			<form
				onSubmit={handleSubmit}
				className={cn(
					"bg-gray-50 dark:bg-gray-900 pt-2 w-full",
					hasInteracted ? "sticky bottom-0" : "max-w-[550px]"
				)}
			>
				<div className="relative">
					<Textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your message..."
						className={cn(
							"md:text-base min-h-[5rem] max-h-[15rem] rounded-[12px] flex-grow resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 outline-none",
							!hasInteracted && "max-h-[120px] h-[112px] rounded-[20px]"
						)}
						rows={1}
					/>
					<div className="absolute right-2 bottom-2">
						<div className="relative inline-flex items-center">
							<Button
								type="submit"
								disabled={isLoading || input === ""}
								className="bg-blue-500 size-8 rounded-full hover:bg-blue-600 text-white"
							>
								{isLoading ? (
									<Loader2 className="h-4 w-4" />
								) : (
									<ArrowUp className="h-4 w-4" />
								)}
							</Button>
							{isLoading && (
								<div
									onClick={handleStop}
									className="animate-pulse border-solid border-[2px] flex justify-center items-center border-gray-600 w-[18px] h-[18px] rounded-sm bg-white cursor-pointer dark:bg-gray-800 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
								>
									<div className="w-2.5 h-2.5 bg-gray-500" />
								</div>
							)}
						</div>
					</div>
				</div>
			</form>
			{!hasInteracted && (
				<div className="mt-3 text-[12px] text-gray-500 dark:text-gray-400">
					<p>Ai can make mistake, verify sensitive information</p>
				</div>
			)}
		</div>
	);
}
