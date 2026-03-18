import { useEffect } from "react";
import Button from "@mui/material/Button";

const ErrorModal = ({ isOpen, error, onClose, onUpdateApiKey }) => {
  useEffect(() => {
    // Handle click outside to close
    const handleClickOutside = (e) => {
      if (e.target.id === "errorModalOverlay") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let message = "An error occurred while processing your request.";

  if (typeof error === "string") {
    if (error.includes("API_QUOTA_EXCEEDED")) {
      message = error.includes(":")
        ? error.split(":").slice(1).join(":").trim() ||
          "API quota exceeded. Please update your API key or try again later."
        : "API quota exceeded. Please update your API key or try again later.";
    } else if (error.includes("INVALID_API_KEY")) {
      message = error.includes(":")
        ? error.split(":").slice(1).join(":").trim() ||
          "Invalid API key. Please update your API key."
        : "Invalid API key. Please update your API key.";
    } else if (error.includes("API_ERROR")) {
      message = error.includes(":")
        ? error.split(":").slice(1).join(":").trim() ||
          error.replace("API_ERROR: ", "")
        : error.replace("API_ERROR: ", "");
    } else {
      // For other errors, show the full message or extract if it has colon
      message = error.includes(":")
        ? error.split(":").slice(1).join(":").trim() || error
        : error;
    }
  } else if (error && error.message) {
    message = error.message;
  }

  return (
    <div
      id="errorModalOverlay"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity"
    >
      <div className="bg-gray-900 border border-red-900/40 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden flex flex-col transform transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-red-950/10">
          <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
            <i className="fas fa-exclamation-circle"></i>
            Error
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <p className="text-gray-200 text-sm leading-relaxed" id="errorMessage">
              {message}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              id="updateApiKeyFromErrorBtn"
              onClick={() => {
                onClose();
                onUpdateApiKey();
              }}
              variant="outlined"
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.2)",
                textTransform: "none",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.4)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                },
              }}
            >
              Update API Key
            </Button>
            <Button
              id="closeErrorBtn"
              onClick={onClose}
              variant="contained"
              sx={{
                textTransform: "none",
                background: "#374151",
                "&:hover": {
                  background: "#4b5563",
                },
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
