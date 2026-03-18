import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Button from "@mui/material/Button";

const CTASection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-24 relative overflow-hidden bg-gray-900 border-t border-gray-800">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full max-h-96 rounded-full bg-gradient-to-r from-blue-600/20 to-orange-500/20 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Ready to Transform Your Development Process?
        </h2>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Join thousands of developers who are building faster with AI
        </p>

        <div className="flex justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard">
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
                startIcon={<i className="fas fa-arrow-right mr-2"></i>}
              >
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/signup">
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
                startIcon={<i className="fas fa-arrow-right mr-2"></i>}
              >
                Start Building for Free
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
