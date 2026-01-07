import { List, Action, ActionPanel, showToast, Toast, getPreferenceValues, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
    apiUrl: string;
    authToken: string;
}

interface RecallResult {
    id: string;
    content: string;
    contentType: string;
    enrichedTitle?: string;
    enrichedDescription?: string;
    sourceDomain?: string;
    createdAt: string;
    similarity: number;
}

interface RecallResponse {
    results: RecallResult[];
    meta: {
        contextType: string;
        candidateCount: number;
        returnedCount: number;
    };
}

export default function RecallCommand() {
    const [results, setResults] = useState<RecallResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const preferences = getPreferenceValues<Preferences>();
    const apiUrl = preferences.apiUrl || "https://leo-brain.vercel.app";

    useEffect(() => {
        async function fetchRecall() {
            try {
                // Get clipboard content as context
                const clipboardText = await Clipboard.readText();

                if (!clipboardText) {
                    setError("No clipboard content. Copy something to recall related items.");
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(`${apiUrl}/api/recall`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${preferences.authToken}`,
                    },
                    body: JSON.stringify({
                        context: clipboardText,
                        contextType: "text",
                    }),
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = (await response.json()) as RecallResponse;
                setResults(data.results || []);

                if (data.results.length === 0) {
                    await showToast({
                        style: Toast.Style.Success,
                        title: "Nothing relevant found",
                    });
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                setError(errorMessage);
                await showToast({
                    style: Toast.Style.Failure,
                    title: "Recall failed",
                    message: errorMessage,
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchRecall();
    }, []);

    if (error) {
        return (
            <List>
                <List.EmptyView
                    icon="🔍"
                    title="No Results"
                    description={error}
                />
            </List>
        );
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search recalled items...">
            {results.length === 0 && !isLoading ? (
                <List.EmptyView
                    icon="✨"
                    title="Nothing relevant found"
                    description="Try copying different text and run recall again"
                />
            ) : (
                results.map((item) => (
                    <List.Item
                        key={item.id}
                        icon={item.contentType === "url" ? "🔗" : "📝"}
                        title={item.enrichedTitle || item.content.substring(0, 60)}
                        subtitle={item.sourceDomain || ""}
                        accessories={[
                            { text: `${Math.round(item.similarity * 100)}%` },
                            { date: new Date(item.createdAt) },
                        ]}
                        actions={
                            <ActionPanel>
                                {item.contentType === "url" ? (
                                    <Action.OpenInBrowser url={item.content} title="Open URL" />
                                ) : (
                                    <Action.CopyToClipboard content={item.content} title="Copy" />
                                )}
                                <Action.CopyToClipboard content={item.content} title="Copy Content" />
                            </ActionPanel>
                        }
                    />
                ))
            )}
        </List>
    );
}
