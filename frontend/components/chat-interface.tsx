"use client";

import { useState, useRef, type FC } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { NoSessionState } from "./no-session-state";
import { ChatPanel } from "./chat-panel";

// --- Data Types ---
export type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  fileNames?: string[];
  figure?: string;
  runId?: string;
  chart?: "bar" | "heatmap";
};

export type Session = {
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
- Dont trust a single simple OLS fit for inference or causal claims. The OLS assumptions are violated (nonlinearity, heteroscedasticity, non-normal errors, and time dependence), so p-values and confidence intervals from naive OLS are unreliable.`,
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [autoConnectId, setAutoConnectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // =========================================================
  // HANDLER: Start from Landing Page
  // =========================================================
  const handleStartSession = async (prompt: string, files: File[]) => {
    setIsLoading(true);

    try {
      // 1. Prepare Data
      const formData = new FormData();
      formData.append("prompt", prompt);
      files.forEach((f) => formData.append("files", f));
      // Note: We DO NOT send session_id here, so backend generates a new one.

      // 2. Call Backend
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to initialize session");
      }

      const data = await response.json();
      const newSessionId = data.session_id;

      // 3. Construct Local Session Object
      // We manually add the user's first prompt so it appears in the chat history
      const newSession: Session = {
        id: newSessionId,
        title: "Data Analyst",
        messages: [
          {
            id: generate_message_id(),
            role: "user",
            content: prompt,
            fileNames: files.map((f) => f.name),
          },
        ],
      };

      // 4. Update State
      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newSessionId);
      setAutoConnectId(newSessionId); // Signal the child to connect
    } catch (error) {
      console.error("Initialization failed:", error);
      alert("Failed to start session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to update session state from child
  const handleSessionUpdate = (updatedSession: Session) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-neutral-500 font-medium">
            Initializing Workspace...
          </p>
        </div>
      </div>
    );
  }

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
      {activeSession ? (
        <ChatPanel
          key={activeSession.id} // Key ensures remount on session switch
          session={activeSession}
          onUpdateSession={handleSessionUpdate}
          // Only auto-connect if this is the session we just created
          shouldAutoConnect={activeSession.id === autoConnectId}
        />
      ) : (
        <NoSessionState onStart={handleStartSession} />
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
