"use client";

import { useState, useRef, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip,
  Send,
  Plus,
  X,
  MessageSquare,
  BarChart,
  Grid,
} from "lucide-react";

// --- Data Types ---
type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  fileNames?: string[];
  chart?: "bar" | "heatmap";
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
};

const generate_message_id = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const initialSessions: Session[] = [
  {
    id: "session-1",
    title: "Data Analyst",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Analyse the correlation between gold price and gold volume",
        fileNames: ["data.csv"],
      },
      {
        id: "msg-2",
        role: "bot",
        content: "...Initiating Task",
      },
      {
        id: "msg-22",
        role: "bot",
        content: "...Analysing Diagrams",
      },
      {
        id: "msg-23",
        role: "bot",
        content: "...Fabricating Final Answer",
      },
      {
        id: "msg-3",
        role: "bot",
        content: `Short summary of what the data already suggests
- There is an average negative association between gold price and traded volume: higher volumes tend to occur with lower prices.  
- The relationship is weak and unstable: scatter points are widely spread with clusters and outliers, residuals from a simple linear fit show curvature and changing spread, and residuals have heavy tails.  
- Time structure matters: price trends upward while volume tends downward with spikes. The price–volume link appears to change over time (nonstationarity / regime changes).

Key caution
- Don’t trust a single simple OLS fit for inference or causal claims. The OLS assumptions are violated (nonlinearity, heteroscedasticity, non-normal errors, and time dependence), so p-values and confidence intervals from naive OLS are unreliable.`,
      },
    ],
  },
];

// =================================================================
// Main Layout Component
// =================================================================
export function ChatLayout() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const addNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: Session = {
      id: newSessionId,
      title: `New Chat ${sessions.length}`,
      messages: [],
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newSessionId);
  };

  return (
    <div className="h-dvh overflow-y-scroll gap-4">
      {/* Sidebar for Sessions */}
      {/* <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewSession={addNewSession}
      /> */}

      {/* Main Chat Panel */}
      {activeSession && (
        <ChatPanel key={activeSession.id} session={activeSession} />
      )}
    </div>
  );
}

// =================================================================
// Chat Sidebar Component
// =================================================================
interface ChatSidebarProps {
  sessions: Session[];
  activeSessionId: string;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
}

const ChatSidebar: FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
}) => {
  return (
    <aside
      className="
        flex flex-col w-72 h-full max-h-[720px] m-auto p-4
        bg-neutral-100/60 backdrop-blur-xl
        border border-neutral-200/80 rounded-2xl shadow-sm
      "
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-300/50">
        <h2 className="text-lg font-semibold text-neutral-800">
          Chat Sessions
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewSession}
          className="text-neutral-600 hover:text-neutral-900"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="space-y-1">
          {sessions.map((session) => (
            <Button
              key={session.id}
              variant={session.id === activeSessionId ? "secondary" : "ghost"}
              className="w-full justify-start h-10"
              onClick={() => onSessionSelect(session.id)}
            >
              <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{session.title}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

// =================================================================
// Chat Panel Component
// =================================================================
const ChatPanel: FC<{ session: Session }> = ({ session }) => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[] | []>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILES = 3;

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

  const handleSend = async (userRequest: string, files: File[] | undefined) => {
    const userMsg: Message = {
      id: generate_message_id(),
      role: "user",
      content: userRequest,
      fileNames: files && [...files.map((f) => f.name)],
    };
    setPrompt("");
    setUploadedFiles([]);
    setMessages((prev) => [...prev, userMsg]);
    const formData = new FormData();
    formData.append("prompt", userRequest);
    if (files) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    const response = await fetch("/api/process", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to start process");
    }

    const { session_id } = await response.json();
    console.log("Process started with session_id:", session_id);

    const UPSTREAM_URL = process.env.UPSTREAM_URL || "http://0.0.0.0:8000";
    const eventSource = new EventSource(
      `${UPSTREAM_URL}/api/v1/process/events/${session_id}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const botMsg: Message = {
          id: generate_message_id(),
          role: "bot",
          content: data.message,
        };

        if (data.type == "progress") {
          botMsg.content = "..." + data.message;
        } else if (data.type == "response") {
          botMsg.content = data.message;
        } else {
          console.log("SSE data:", data);
          return;
        }

        setMessages((prev) => [...prev, botMsg]);
        console.log("SSE data:", data);
      } catch (e) {
        if (event.data === "[DONE]") {
          console.log("Stream finished, closing connection.");
          eventSource.close(); // <-- Client closes itself
          return;
        }
        console.log("Non-JSON SSE event:", event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error", err);
      eventSource.close();
    };

    // terminating the connection on component unmount
    return () => eventSource.close();
  };

  return (
    <div
    // className="
    //   flex flex-col flex-1 h-full
    //   bg-white/60 backdrop-blur-xl
    //   border border-neutral-200/80 rounded-2xl shadow-sm
    // "
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-300/50">
        <h3 className="text-xl font-semibold text-neutral-900">
          {session.title}
        </h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-900 border border-neutral-200"
                }`}
              >
                <p className="mb-2">{msg.content}</p>
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
                {msg.chart && <GraphPlaceholder type={msg.chart} />}
              </div>
            </div>
          ))}
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
              onClick={async () => handleSend(prompt, uploadedFiles)}
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
    </div>
  );
};

// =================================================================
// Placeholder for Graphs/Figures
// =================================================================
const GraphPlaceholder: FC<{ type: "bar" | "heatmap" }> = ({ type }) => (
  <div className="mt-3 p-4 border rounded-md bg-white/50">
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
  </div>
);
