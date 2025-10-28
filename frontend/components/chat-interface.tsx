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
  fileName?: string;
  chart?: "bar" | "heatmap";
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
};

// --- Mock Data ---
const initialSessions: Session[] = [
  {
    id: "session-1",
    title: "Quarterly Sales Analysis",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Analyze sales_data_2024.csv. What are the key trends?",
        fileName: "sales_data_2024.csv",
      },
      {
        id: "msg-2",
        role: "bot",
        content:
          "Of course. The data shows a significant 25% YoY growth, with the 'Electronics' category leading. The 'North' region was the top performer in Q4.",
        chart: "bar",
      },
      {
        id: "msg-3",
        role: "bot",
        content:
          "There is also a strong positive correlation between advertising spend and sales volume across all product categories.",
        chart: "heatmap",
      },
    ],
  },
  {
    id: "session-2",
    title: "User Engagement Metrics",
    messages: [],
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
    <div className="flex h-dvh w-full overflow-y-scroll max-w-7xl gap-4">
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {session.messages.map((msg) => (
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
                {msg.fileName && (
                  <Badge
                    variant="secondary"
                    className="font-normal cursor-default"
                  >
                    <Paperclip className="h-3 w-3 mr-1.5" /> {msg.fileName}
                  </Badge>
                )}
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
              ref={fileInputRef}
              onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5 text-neutral-600" />
            </Button>
            <Button size="icon" disabled={!prompt}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {uploadedFile && (
          <div className="mt-3">
            <Badge variant="outline" className="font-normal p-2">
              {uploadedFile.name}
              <button
                onClick={() => setUploadedFile(null)}
                className="ml-1.5 rounded-full hover:bg-neutral-200 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
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
