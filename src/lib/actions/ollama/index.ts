"use server";

const DEEPSEEK_BASE_URL = "http://localhost:11434";

export async function postMessage(prompt: string) {
	const response = await fetch(`${DEEPSEEK_BASE_URL}/api/generate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: "deepseek-r1:1.5b", prompt, stream: true }),
	});

	if (!response.body) throw new Error("No response body from Ollama");

	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	return new ReadableStream({
		start(controller) {
			const processStream = async () => {
				let buffer = "";

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });

						// Handle line-based JSON streaming
						const lines = buffer.split("\n");
						buffer = lines.pop() || ""; // Keep incomplete line for next chunk

						for (const line of lines) {
							try {
								const json = JSON.parse(line);
								if (json.response) {
									controller.enqueue(json.response);
								}
							} catch (err: unknown) {
								console.error("JSON parse error:", err);
								console.warn("Skipping invalid JSON chunk:", line);
							}
						}
					}
				} catch (error) {
					console.error("Stream error:", error);
				} finally {
					controller.close();
				}
			};

			processStream();
		},
		cancel() {
			console.log("Stream aborted");
			reader.cancel();
		},
	});
}
