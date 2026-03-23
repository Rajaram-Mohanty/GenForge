import { Link } from "react-router-dom";
import Button from "@mui/material/Button";

const DashboardNavbar = ({ onMenuClick, onApiKeyClick }) => {
  return (
    <nav className="w-full bg-gray-900 border-b border-gray-800 shadow-sm sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Hamburger menu — opens ProjectSidebar */}
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            title="Toggle Sidebar"
          >
            <i className="fas fa-bars fa-lg"></i>
          </button>

          {/* App name — redirects to home */}
          <h3 className="text-xl font-bold tracking-tight">
            <Link
              to="/"
              className="text-white hover:opacity-80 transition-opacity"
            >
              Gen<span className="text-orange-500">Forge</span>
            </Link>
          </h3>
        </div>

        <Button
          onClick={onApiKeyClick}
          variant="contained"
          sx={{
            py: 0.75,
            px: 2,
            textTransform: "none",
            fontSize: "0.9rem",
            fontWeight: 600,
            borderRadius: "0.375rem",
            background: "#f97316",
            boxShadow: "0 2px 4px rgba(249, 115, 22, 0.2)",
            "&:hover": {
              background: "#ea580c",
              boxShadow: "0 4px 6px rgba(249, 115, 22, 0.3)",
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s ease",
          }}
          endIcon={<i className="fas fa-key text-sm"></i>}
        >
          API Key
        </Button>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
