import { useState, useEffect, useRef } from "react";
import { apiService } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

const ApiKeyModal = ({ isOpen, onClose, mode = "update", onApiKeySaved }) => {
  const { checkAuthStatus } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Handle click outside to close (only in update mode, not add mode)
    const handleClickOutside = (e) => {
      if (e.target.id === "apiKeyModalOverlay" && mode !== "add") {
        handleClose();
      }
    };

    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Only allow closing by clicking outside in update mode
      if (mode !== "add") {
        document.addEventListener("click", handleClickOutside);
      }
      // Focus input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      if (mode !== "add") {
        document.removeEventListener("click", handleClickOutside);
      }
      document.body.style.overflow = "unset";
    };
  }, [isOpen, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert("Please enter a valid API key");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiService.updateApiKey(apiKey.trim());
      if (result.success) {
        // Refresh user data to update hasApiKey status
        if (checkAuthStatus) {
          await checkAuthStatus();
        }
        // Notify parent component that API key was saved
        if (onApiKeySaved) {
          onApiKeySaved();
        }
        alert(
          mode === "add"
            ? "API key saved successfully!"
            : "API key updated successfully!",
        );
        // Clear form and close modal - bypass handleClose check since API key is now saved
        setApiKey("");
        setError("");
        setSuccess("");
        onClose();
      } else {
        setError(result.error || "Failed to update API key");
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      setError(error.message || "Failed to update API key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setApiKey("");
    setError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="apiKeyModalOverlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden flex flex-col transform transition-transform">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white">
            {mode === "add" ? "Add API Key" : "Update API Key"}
          </h3>
          <button
            id="closeApiKeyModal"
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-300">
            {mode === "add"
              ? "Please add your OpenRouter API key to start generating projects:"
              : "Please enter your new OpenRouter API key:"}
          </p>
          <div>
            <a
              href="https://openrouter.ai/workspaces/default/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <i className="fas fa-external-link-alt"></i> Get OpenRouter Key
            </a>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="apiKeyInput"
              placeholder="Enter your API key here..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              ref={inputRef}
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-12"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !loading && apiKey.trim()) {
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
            >
              <i
                className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </button>
          </div>

          {error && (
            <Alert severity="error" sx={{ borderRadius: '0.5rem' }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ borderRadius: '0.5rem' }}>
              {success}
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              id="cancelApiKeyBtn"
              onClick={handleClose}
              disabled={loading}
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
              Cancel
            </Button>
            <Button
              id="updateApiKeyBtn"
              onClick={handleSubmit}
              disabled={loading || !apiKey.trim()}
              variant="contained"
              sx={{
                textTransform: "none",
                background: "linear-gradient(to right, #3b82f6, #f97316)",
                "&:hover": {
                  background: "linear-gradient(to right, #2563eb, #ea580c)",
                },
                "&:disabled": {
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "rgba(255, 255, 255, 0.3)",
                },
              }}
            >
              {loading
                ? mode === "add"
                  ? "Saving..."
                  : "Updating..."
                : mode === "add"
                  ? "Save API Key"
                  : "Update API Key"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
