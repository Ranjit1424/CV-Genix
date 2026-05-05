import React from "react";
import {
  FaComments,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPaperPlane,
  FaRobot,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";

function ChatDock({
  ollamaModel,
  chatLoading,
  speakerOn,
  setSpeakerOn,
  chatMessages,
  chatFiles,
  setChatFiles,
  chatInput,
  setChatInput,
  sendChatMessage,
  resetChat,
  listening,
  startVoiceCapture,
  stopVoiceCapture,
}) {
  return (
    <aside id="chat-dock" className="w-full lg:w-[360px]">
      <div className="chat-dock-shell sticky top-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="chat-dock-icon">
              <FaComments />
            </div>
            <div>
              <div className="chat-dock-label font-semibold leading-tight">
                Resume Copilot
              </div>
              <div className="chat-dock-subtle text-xs">Ollama - {ollamaModel}</div>
            </div>
          </div>
          <div className="chat-dock-subtle flex items-center gap-1 text-xs">
            <FaRobot />
            <span>{chatLoading ? "Thinking..." : "Ready"}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeakerOn((prev) => !prev)}
            className="chat-dock-chip btn btn-xs px-2 flex items-center gap-1"
            title={speakerOn ? "Turn off voice playback" : "Read assistant replies aloud"}
          >
            {speakerOn ? (
              <FaVolumeUp className="w-4 h-4" />
            ) : (
              <FaVolumeMute className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {speakerOn ? "Speaking" : "Silent"}
            </span>
          </button>
        </div>

        <div className="h-[65vh] overflow-y-auto space-y-2 pr-2">
          {chatMessages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}-${msg.content.slice(0, 10)}`}
              className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`chat-dock-message ${
                  msg.role === "assistant"
                    ? "chat-dock-message-assistant text-left"
                    : "chat-dock-message-user text-left"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="chat-dock-message chat-dock-message-assistant text-sm flex items-center gap-2">
                <span className="loading loading-dots loading-xs" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendChatMessage} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="chat-dock-chip btn btn-xs">
              Attach file
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setChatFiles(files);
                }}
              />
            </label>
            {chatFiles.length > 0 && (
              <button
                type="button"
                className="chat-dock-chip btn btn-xs"
                onClick={() => setChatFiles([])}
              >
                Clear files
              </button>
            )}
          </div>
          {chatFiles.length > 0 && (
            <div className="chat-dock-subtle text-xs">
              Attached: {chatFiles.map((f) => f.name).join(", ")}
            </div>
          )}
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            rows={2}
            className="resume-builder-textarea chat-dock-textarea"
            placeholder="Ask for bullet points, wording tweaks, or template tips..."
            disabled={chatLoading}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="landing-button-primary chat-dock-button gap-2"
              disabled={chatLoading || !chatInput.trim()}
            >
              {chatLoading && <span className="loading loading-spinner loading-xs" />}
              <FaPaperPlane /> Send
            </button>
            <button
              type="button"
              className="chat-dock-button-ghost"
              onClick={resetChat}
              disabled={chatLoading}
            >
              Reset
            </button>
            <button
              type="button"
              className={`chat-dock-button-ghost flex items-center gap-2 ${
                listening ? "border-rose-300/35 bg-rose-300/10 text-rose-100" : ""
              }`}
              onClick={() => (listening ? stopVoiceCapture() : startVoiceCapture())}
              disabled={chatLoading}
              title={listening ? "Stop listening" : "Speak your message"}
            >
              {listening ? (
                <FaMicrophoneSlash className="w-4 h-4" />
              ) : (
                <FaMicrophone className="w-4 h-4" />
              )}
              <span className="text-xs">{listening ? "Listening..." : "Speak"}</span>
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}

export default ChatDock;
