import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthForm from "../components/AuthForm";

const SignupPage = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      const result = await signup(
        formData.name,
        formData.email,
        formData.password,
      );
      if (result.success) {
        // After successful signup, navigate to dashboard and trigger Add API Key modal
        navigate("/dashboard", { state: { showAddApiKey: true } });
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    setLoading(true);
    setError("");

    try {
      const result = await googleLogin(credential);
      if (result.success) {
        if (!result.hasApiKey) {
          navigate("/dashboard", { state: { showAddApiKey: true } });
        } else {
          navigate("/dashboard");
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/20 blur-[100px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8">
          <Link
            to="/"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Home
          </Link>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-orange-500"></div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                Gen<span className="text-orange-500">Forge</span>
              </Link>
            </h1>
            <p className="text-gray-400 text-sm">
              AI-Powered Development Platform
            </p>
          </div>

          <AuthForm
            mode="signup"
            onSubmit={handleSubmit}
            onGoogleLogin={handleGoogleLogin}
            error={error}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
