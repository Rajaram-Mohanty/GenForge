import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";

const AuthForm = ({ mode, onSubmit, error, loading }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-700/50 pb-4">
        <Link
          to="/login"
          className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors border-b-2 ${
            mode === "login"
              ? "text-blue-500 border-blue-500"
              : "text-gray-400 border-transparent hover:text-gray-300"
          }`}
        >
          <i className="fas fa-sign-in-alt"></i>
          Login
        </Link>
        <Link
          to="/signup"
          className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors border-b-2 ${
            mode === "signup"
              ? "text-blue-500 border-blue-500"
              : "text-gray-400 border-transparent hover:text-gray-300"
          }`}
        >
          <i className="fas fa-user-plus"></i>
          Sign Up
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle"></i>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-gray-300 flex items-center gap-2"
            >
              <i className="fas fa-user text-gray-500"></i>
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="John Doe"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-gray-300 flex items-center gap-2"
          >
            <i className="fas fa-envelope text-gray-500"></i>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-gray-300 flex items-center gap-2"
          >
            <i className="fas fa-lock text-gray-500"></i>
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={mode === "signup" ? 6 : undefined}
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        {mode === "login" && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-700 bg-gray-900/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              Remember me
            </label>
            <a
              href="#"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </a>
          </div>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{
            py: 1.5,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: "0.5rem",
            background: "linear-gradient(to right, #3b82f6, #f97316)",
            boxShadow: "0 4px 14px 0 rgba(0, 0, 0, 0.25)",
            "&:hover": {
              background: "linear-gradient(to right, #2563eb, #ea580c)",
              boxShadow: "0 6px 20px 0 rgba(0, 0, 0, 0.3)",
            },
          }}
          startIcon={
            <i
              className={`fas fa-${mode === "login" ? "sign-in-alt" : "user-plus"}`}
            ></i>
          }
        >
          {loading
            ? "Processing..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </Button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700/50"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gray-800 text-gray-400">
            or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outlined"
          sx={{
            color: "#fff",
            borderColor: "#374151",
            textTransform: "none",
            py: 1,
            "&:hover": {
              borderColor: "#4b5563",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          }}
          startIcon={<i className="fab fa-google"></i>}
        >
          Google
        </Button>
        <Button
          variant="outlined"
          sx={{
            color: "#fff",
            borderColor: "#374151",
            textTransform: "none",
            py: 1,
            "&:hover": {
              borderColor: "#4b5563",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          }}
          startIcon={<i className="fab fa-github"></i>}
        >
          GitHub
        </Button>
      </div>

      <div className="mt-8 text-center text-sm text-gray-400">
        {mode === "login" ? (
          <p>
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
