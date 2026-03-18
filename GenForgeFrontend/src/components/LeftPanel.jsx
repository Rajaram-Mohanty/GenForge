import { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
const LeftPanel = ({
  currentProject,
  onProjectCreate,
  onProjectUpdate,
  width,
  tempMessages = [],
  isGenerating = false,
}) => {
  const [messages, setMessages] = useState([]);
  const [promptInput, setPromptInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (currentProject && currentProject.chats) {
      // Transform chats to match message format
      const formattedMessages = currentProject.chats.map((chat) => ({
        role: chat.role === "assistant" ? "agent" : chat.role, // Map assistant to agent for display
        content: chat.content || chat.message || "",
        timestamp: chat.timestamp || chat.createdAt || new Date(),
      }));
      setMessages(formattedMessages);
    } else if (tempMessages.length > 0) {
      setMessages(tempMessages);
    } else {
      setMessages([]);
    }
  }, [currentProject, tempMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmitPrompt = async () => {
    if (!promptInput.trim() || isLoading) return;

    const promptValue = promptInput.trim();

    // Add initial user message matching EJS version
    const userMessage = {
      role: "user",
      content: `🚀 Starting to build your application: "${promptValue}"`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput("");
    setIsLoading(true);

    try {
      let result;

      if (currentProject && onProjectUpdate) {
        // Update existing project
        result = await onProjectUpdate(currentProject._id, promptValue);
      } else {
        // Create new project
        result = await onProjectCreate(promptValue);
      }

      if (result.success) {
        // Messages from the generation are already in the project's chats array
        // They will be loaded when currentProject updates
        // Just add completion message
        const successMessage = {
          role: "agent",
          content: "✅ Generation complete.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        const errorMessage = {
          role: "agent",
          content: `Error: ${result.error || "Failed to process request"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = {
        role: "agent",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-gray-900"
      id="leftPanel"
      style={{ width: `${width}%` }}
    >
      {/* Chat Messages Container */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6"
        id="chatMessagesContainer"
      >
        <div
          className="flex flex-col space-y-6 max-w-3xl mx-auto"
          id="chatMessages"
          ref={chatMessagesRef}
        >
          {messages.length === 0 ? (
            <div className="flex justify-center my-8">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-6 py-4 text-center max-w-sm">
                <div className="text-gray-300">
                  <i className="fas fa-hand-sparkles text-blue-400 mb-2 text-xl block"></i>
                  Welcome! Start by entering a prompt to create your
                  application.
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex w-full ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : message.content.includes("Error")
                        ? "bg-red-500/10 border border-red-500/30 text-red-200 rounded-bl-sm"
                        : message.content.includes("✅")
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-bl-sm"
                          : "bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-bl-sm shadow-sm flex items-center gap-3">
                <i className="fas fa-circle-notch fa-spin text-blue-400"></i>
                <span className="text-sm font-medium">
                  Generating your application...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Input Section */}
      <div
        className="flex-none p-4 bg-gray-950/80 backdrop-blur-md border-t border-gray-800"
        id="promptSectionSplit"
      >
        <div className="max-w-3xl mx-auto relative group flex items-center shadow-lg rounded-xl overflow-hidden bg-gray-900 border border-gray-700 transition-colors focus-within:border-blue-500/50">
          <input
            type="text"
            id="promptInputSplit"
            className="flex-1 bg-transparent text-white px-5 py-3.5 focus:outline-none placeholder-gray-500 text-sm"
            placeholder="Enter a prompt to modify or build..."
            maxLength="500"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isGenerating}
          />
          <div className="px-2">
            <Button
              type="button"
              id="submitPromptSplit"
              onClick={handleSubmitPrompt}
              disabled={isLoading || isGenerating || !promptInput.trim()}
              variant="contained"
              sx={{
                minWidth: "auto",
                px: 2,
                py: 1,
                borderRadius: "0.5rem",
                textTransform: "none",
                fontWeight: 600,
                background: "linear-gradient(to right, #3b82f6, #f97316)",
                boxShadow: "0 2px 8px 0 rgba(249, 115, 22, 0.25)",
                "&:hover": {
                  background: "linear-gradient(to right, #2563eb, #ea580c)",
                  boxShadow: "0 4px 12px rgba(249, 115, 22, 0.4)",
                },
                "&:disabled": {
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "rgba(255, 255, 255, 0.3)",
                },
              }}
            >
              <i className="fas fa-paper-plane"></i>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
