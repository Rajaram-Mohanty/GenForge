import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <Link
              to="/"
              className="text-3xl font-extrabold tracking-tighter text-white hover:opacity-90 transition-opacity"
            >
              Gen
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                Forge
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-6">
                <span className="text-gray-300 font-medium">
                  Welcome,{" "}
                  <span className="text-white font-semibold">
                    {user?.username}
                  </span>
                  !
                </span>
                <Link to="/dashboard">
                  <Button
                    variant="outlined"
                    sx={{
                      color: "white",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "0.5rem",
                      px: 3,
                      "&:hover": {
                        borderColor: "rgba(255, 255, 255, 0.4)",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                      },
                    }}
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="contained"
                  onClick={handleLogout}
                  sx={{
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "0.5rem",
                    px: 3,
                    boxShadow: "none",
                    "&:hover": {
                      background: "rgba(239, 68, 68, 0.2)",
                      boxShadow: "none",
                    },
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login">
                  <Button
                    variant="text"
                    sx={{
                      color: "#d1d5db",
                      textTransform: "none",
                      fontWeight: 600,
                      px: 3,
                      "&:hover": {
                        color: "white",
                        backgroundColor: "transparent",
                      },
                    }}
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    variant="contained"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "0.5rem",
                      px: 4,
                      py: 1,
                      background: "linear-gradient(to right, #3b82f6, #f97316)",
                      boxShadow: "0 4px 14px 0 rgba(249, 115, 22, 0.39)",
                      "&:hover": {
                        background:
                          "linear-gradient(to right, #2563eb, #ea580c)",
                        boxShadow: "0 6px 20px rgba(249, 115, 22, 0.5)",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <IconButton
              onClick={toggleMobileMenu}
              sx={{ color: "white" }}
              aria-label="Toggle mobile menu"
            >
              <i
                className={`fas ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}
              ></i>
            </IconButton>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden absolute top-20 w-full bg-gray-950 border-b border-gray-800 transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? "max-h-64 border-t" : "max-h-0 border-t-0"
        }`}
      >
        <div className="px-4 pt-4 pb-6 space-y-4">
          {isAuthenticated ? (
            <div className="flex flex-col gap-4">
              <span className="text-gray-300 font-medium px-2 border-b border-gray-800 pb-2">
                Welcome,{" "}
                <span className="text-white font-semibold">
                  {user?.username}
                </span>
                !
              </span>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    color: "white",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                sx={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    color: "white",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  Login
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    background: "linear-gradient(to right, #3b82f6, #f97316)",
                  }}
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
