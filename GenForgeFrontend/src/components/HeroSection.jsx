import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Button from "@mui/material/Button";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex-1">
      {/* Background decoration elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -ml-40 z-0 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -mr-40 z-0 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col items-center">
        <div className="text-center w-full max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8">
            Build Applications with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-500 block mt-2 pb-2">
              {" "}
              AI Power
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl leading-relaxed">
            Transform your ideas into fully functional applications using the
            power of AI. Generate and download complete project structures with
            just a prompt.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16 w-full">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-block">
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: "0.75rem",
                    background: "linear-gradient(to right, #3b82f6, #f97316)",
                    boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)",
                    "&:hover": {
                      background: "linear-gradient(to right, #2563eb, #ea580c)",
                      boxShadow: "0 15px 30px -5px rgba(249, 115, 22, 0.5)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.2s ease",
                  }}
                  startIcon={<i className="fas fa-rocket mr-2"></i>}
                >
                  Start Building
                </Button>
              </Link>
            ) : (
              <Link to="/signup" className="inline-block">
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: "0.75rem",
                    background: "linear-gradient(to right, #3b82f6, #f97316)",
                    boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)",
                    "&:hover": {
                      background: "linear-gradient(to right, #2563eb, #ea580c)",
                      boxShadow: "0 15px 30px -5px rgba(249, 115, 22, 0.5)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.2s ease",
                  }}
                  startIcon={<i className="fas fa-rocket mr-2"></i>}
                >
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto mt-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl transform transition-transform duration-500 hover:scale-[1.02]">
            <div className="border-b border-gray-800 bg-gray-950/50 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                Generated Code
              </span>
              <div className="w-12"></div>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              <div className="text-gray-300">
                <span className="text-purple-400">const</span>
                <span className="text-blue-300"> app</span> =
                <span className="text-yellow-200"> express</span>();
              </div>
              <div className="text-gray-300 mt-2">
                <span className="text-blue-300">app</span>.
                <span className="text-yellow-200">get</span>(
                <span className="text-green-400">'/'</span>, (req, res) =&gt;
                &#123;
              </div>
              <div className="text-gray-300 pl-4 mt-2">
                res.<span className="text-yellow-200">render</span>(
                <span className="text-green-400">'index'</span>);
              </div>
              <div className="text-gray-300 mt-2">&#125;);</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
