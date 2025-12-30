"use-client";

import { useState, useRef, useEffect, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, X, BarChart, Grid, Sparkles } from "lucide-react";
import { Session, Message } from "./chat-interface";
import { parseMessageContent } from "@/utils/messageParser";

const generate_message_id = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

// =================================================================
// Chat Panel Component
// =================================================================
interface ChatPanelProps {
  session: Session;
  onUpdateSession: (updatedSession: Session) => void; // Callback to update parent state
  shouldAutoConnect?: boolean; // NEW: Triggers SSE immediately on mount
}

export const ChatPanel: FC<ChatPanelProps> = ({
  session,
  onUpdateSession,
  shouldAutoConnect = false,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[] | []>([]);
  const sessionRef = useRef(session);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILES = 3;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    // Notice we listen to session.messages, not the whole session object
  }, [session.messages, loadingStatus]);

  const addMessage = (msg: Message) => {
    const currentSession = sessionRef.current;
    const updatedMessages = [...currentSession.messages, msg];
    onUpdateSession({ ...currentSession, messages: updatedMessages });
  };

  // =========================================================
  // CORE LOGIC: SSE Connection Manager
  // =========================================================
  const connectToStream = (sessionId: string) => {
    if (isStreaming) return; // Prevent double connections

    console.log(`Connecting to stream for ${sessionId}...`);
    setIsStreaming(true);

    const UPSTREAM_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const eventSource = new EventSource(
      `${UPSTREAM_URL}/api/v1/process/events/${sessionId}`
    );

    const botMsgId = generate_message_id();

    eventSource.onmessage = (event) => {
      // Check for stream end
      if (event.data === "[DONE]") {
        console.log("Stream finished.");
        eventSource.close();
        setIsStreaming(false);
        setLoadingStatus(null);
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data.type === "progress") {
          setLoadingStatus(data.message);
        } else if (data.type === "response") {
          console.info(data.message);
          const currentSession = sessionRef.current;
          setLoadingStatus(null);
          onUpdateSession({
            ...currentSession,
            messages: [
              ...currentSession.messages,
              {
                id: generate_message_id(),
                role: "bot",
                runId: data.message.run_id,
                content: data.message.text,
              },
              // ...data.message?.figures.map((fig: any) => ({
              //   id: generate_message_id(),
              //   role: "bot",
              //   content: fig.text,
              //   figure: fig.filename,
              //   runId: data.message.run_id,
              //   sessId: currentSession.id,
              // })),
            ],
          });
        }
      } catch (e) {
        console.error("Parse error", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
      eventSource.close();
      setIsStreaming(false);
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  };

  // =========================================================
  // EFFECT: Auto-Connect on Mount (For Landing Page Handoff)
  // =========================================================
  useEffect(() => {
    if (shouldAutoConnect && session.id) {
      const cleanup = connectToStream(session.id);
      return cleanup;
    }
  }, [session.id, shouldAutoConnect]);

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const currentFileCount = uploadedFiles.length;

      // Check if we can add any files
      if (currentFileCount >= MAX_FILES) {
        alert(`You can only upload a maximum of ${MAX_FILES} files.`);
        // Clear the input value
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Check if the new selection exceeds the limit
      const remainingSlots = MAX_FILES - currentFileCount;
      let filesToAdd = newFiles;

      if (newFiles.length > remainingSlots) {
        // If it does, only take the files that fit
        filesToAdd = newFiles.slice(0, remainingSlots);
        alert(
          `You can only add ${remainingSlots} more file(s). ${filesToAdd.length} file(s) were added.`
        );
      }

      setUploadedFiles((prevFiles) => [...prevFiles, ...filesToAdd]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // HANDLER: Sending Follow-up Messages
  // =========================================================
  const handleSend = async () => {
    if (!prompt && uploadedFiles.length === 0) return;

    // 1. Optimistic UI Update
    const userMsg: Message = {
      id: generate_message_id(),
      role: "user",
      content: prompt,
      fileNames: uploadedFiles.map((f) => f.name),
    };
    addMessage(userMsg);

    // Clear inputs
    const currentPrompt = prompt;
    const currentFiles = uploadedFiles;
    setPrompt("");
    setUploadedFiles([]);

    // 2. API Call
    const formData = new FormData();
    formData.append("prompt", currentPrompt);
    formData.append("session_id", session.id); // <--- IMPORTANT: Pass existing ID
    currentFiles.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to send message");

      // 3. Start Listening (Reuse the logic)
      connectToStream(session.id);
    } catch (error) {
      console.error(error);
      addMessage({
        id: generate_message_id(),
        role: "bot",
        content: "Error: Could not send message. Please try again.",
      });
    }
  };

  return (
    <div
    // className="
    //   flex flex-col flex-1 h-full
    //   bg-white/60 backdrop-blur-xl
    //   border border-neutral-200/80 rounded-2xl shadow-sm
    // "
    >
      <Header title={`${session.title} - ${session.id}`} />

      {/* Messages */}
      <ScrollArea className="flex-1 pb-[10dvh]">
        <div className="space-y-6 p-4">
          {session.messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent pl-0"
                }`}
              >
                {msg.role === "user" && <p>{msg.content}</p>}

                {/* 2. Render Bot Message with Parser */}
                {msg.role === "bot" && (
                  <div className="text-neutral-900">
                    {parseMessageContent(msg.content, (filename) => {
                      /* This function runs when the parser finds a filename */
                      return (
                        <GraphPlaceholder
                          key={filename}
                          // We pass the FULL content as context/explanation
                          // or you could try to pass just the preceding paragraph

                          figureData={{
                            filename: filename,
                            runId: msg.runId,
                            sessId: session.id,
                            explanation: msg.content,
                          }}
                          type={filename.includes("heat") ? "heatmap" : "bar"}
                        />
                      );
                    })}
                  </div>
                )}
                {msg.fileNames &&
                  msg.fileNames.map((f) => (
                    <Badge
                      variant="secondary"
                      className="font-normal cursor-default"
                      key={f}
                    >
                      <Paperclip className="h-3 w-3 mr-1.5" /> {f}
                    </Badge>
                  ))}

                {/* {msg.figure && (
                  <GraphPlaceholder
                    figureData={{
                      filename: msg.figure,
                      runId: msg.runId,
                      sessId: session.id,
                      explanation: msg.content,
                    }}
                    type={
                      msg.content.toLowerCase().includes("heat")
                        ? "heatmap"
                        : "bar"
                    }
                  />
                )} */}
              </div>
            </div>
          ))}

          <ThinkingLoader
            isStreaming={isStreaming}
            loadingStatus={loadingStatus}
          />
        </div>
      </ScrollArea>

      {/* Input Form */}
      <div
        className="absolute bottom-0 w-[80%] bg-neutral-100/60 backdrop-blur-xl
        rounded-3xl shadow-sm"
      >
        <div className="relative">
          <Textarea
            placeholder="Ask for insights or describe your dataset..."
            className="pr-24 min-h-[60px] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5 text-neutral-600" />
            </Button>
            <Button
              size="icon"
              disabled={!prompt}
              onClick={async () => handleSend()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <Badge key={index} variant="outline" className="font-normal p-2">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1.5 rounded-full hover:bg-neutral-200 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
};

const Header = ({ title }: { title: string }) => {
  return (
    <div className="p-4 border-b border-neutral-300/50">
      <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
    </div>
  );
};

const ThinkingLoader = ({
  isStreaming,
  loadingStatus,
}: {
  isStreaming: boolean;
  loadingStatus: string | null;
}) => {
  return isStreaming && loadingStatus ? (
    <div className="gap-3 animate-in fade-in duration-300">
      <div className="flex items-center space-x-3">
        {/* Icon with spin */}
        <div className="relative flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
        </div>

        {/* Gleaming Text */}
        <span
          className="font-medium text-transparent bg-clip-text bg-[length:200%_auto] animate-shimmer"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #4f46e5 0%, #a855f7 25%, #ec4899 50%, #a855f7 75%, #4f46e5 100%)",
          }}
        >
          {loadingStatus}
        </span>
      </div>
    </div>
  ) : (
    <></>
  );
};

interface FigureMetadata {
  filename?: string;
  sessId?: string;
  runId?: string;
  explanation?: string;
}

interface GraphPlaceholderProps {
  type: "bar" | "heatmap";
  figureData?: FigureMetadata;
}

const GraphPlaceholder: FC<GraphPlaceholderProps> = ({ type, figureData }) => {
  // Construct the full URL if necessary (Ensure your FastAPI serves /static)
  const [isZoomed, setIsZoomed] = useState(false);
  const API_URL = "http://0.0.0.0:8000";
  const imageUrl = figureData
    ? `${API_URL}/api/v1/process/storage/${figureData.sessId}/${figureData.runId}/${figureData.filename}`
    : null;

  return (
    <>
      {/* 1. THUMBNAIL CARD */}
      <div className="p-2 border rounded-xl bg-white shadow-sm overflow-hidden">
        {figureData ? (
          <div
            className="relative group cursor-zoom-in"
            onClick={() => setIsZoomed(true)}
          >
            <img
              src={imageUrl || ""}
              alt="Analysis Result"
              className="w-full h-auto max-h-72 object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://placehold.co/600x400?text=Diagram+Not+Found";
              }}
            />

            {/* Optional: Hover Hint Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center rounded-lg">
              <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md transition-opacity">
                Click to expand
              </div>
            </div>
          </div>
        ) : (
          /* Fallback Placeholder */
          <div className="w-full h-48 flex items-center justify-center bg-neutral-200/70 rounded-md">
            <div className="flex items-center text-neutral-500 font-medium">
              {type === "bar" ? (
                <BarChart className="h-5 w-5 mr-2" />
              ) : (
                <Grid className="h-5 w-5 mr-2" />
              )}
              [ {type} chart placeholder ]
            </div>
          </div>
        )}
      </div>

      {/* 2. FULL SCREEN MODAL */}
      {isZoomed && imageUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsZoomed(false)} // Close on background click
        >
          {/* A. Main Close Button (Top Right) */}
          <button
            className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* B. The Diagram Container 
             - Takes full size. 
             - Uses pb-[25vh] to push the visual center upwards so it doesn't get covered by the text box.
          */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4 md:p-8 pb-[30vh] pointer-events-none"
            aria-hidden="true"
          >
            <img
              src={imageUrl}
              alt="Full Analysis"
              className="max-w-full max-h-full object-contain drop-shadow-2xl animate-in zoom-in-90 duration-300 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* C. The "HUD" Explanation Box 
             - Fixed at bottom.
             - Semi-opaque dark background with blur.
          */}
          <div
            className="absolute bottom-0 left-0 right-0 
                       bg-neutral-900/85 backdrop-blur-xl border-t border-white/10
                       text-neutral-100
                       max-h-[45vh] flex flex-col rounded-t-[2rem] overflow-hidden
                       animate-in slide-in-from-bottom-10 duration-300"
            onClick={(e) => e.stopPropagation()} // Prevent clicks here from closing modal
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center shrink-0 bg-neutral-900/50">
              <h4 className="font-semibold text-xl flex items-center gap-3 text-white">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                Insight Summary
              </h4>
              <div className="flex gap-2">
                {/* Open original button */}
                {/* <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-300 hover:text-white hover:bg-white/10 hidden sm:flex h-9"
                  onClick={() => window.open(imageUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Original
                </Button> */}
                {/* Mobile close button for the card */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-neutral-300 hover:text-white hover:bg-white/10 sm:hidden h-9 w-9"
                  onClick={() => setIsZoomed(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable Explanation Text */}
            <ScrollArea className="flex-1 ">
              <div className="p-6 text-neutral-200 leading-relaxed text-base/7 font-light tracking-wide selection:bg-indigo-500/30">
                {figureData && figureData.explanation && (
                  <div className="whitespace-pre-wrap max-w-4xl mx-auto">
                    {figureData.explanation}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
};
