import { useState } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useAuth } from "../contexts/AuthContext";

const ProjectSidebar = ({
  isOpen,
  onClose,
  projects,
  currentProject,
  onProjectSelect,
  onNewProject,
  loading,
}) => {
  const { deleteProject } = useProject();
  const { logout } = useAuth();
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      setDeletingId(projectId);
      try {
        await deleteProject(projectId);
        if (currentProject && currentProject._id === projectId) {
          onNewProject();
        }
      } catch (error) {
        console.error("Failed to delete project:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div
      id="chatSidebar"
      className={`fixed inset-y-0 left-0 z-[100] w-80 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col shadow-2xl`}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <i className="fas fa-folder-open text-blue-500"></i> Your Projects
          </h3>
          <div className="flex items-center gap-2">
            <button
              id="newChatBtn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 text-xs font-bold shadow-lg shadow-blue-900/20"
              title="Start New Project"
              onClick={onNewProject}
            >
              <i className="fas fa-plus text-[10px]"></i>
              New
            </button>
            <button
              id="closeSidebar"
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center transition-colors"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <ul id="chatList" className="flex-1 p-3 space-y-2">
          {loading ? (
            <li className="flex items-center justify-center p-4 text-gray-400 gap-2">
              <i className="fas fa-spinner fa-spin text-blue-500"></i>
              Loading projects...
            </li>
          ) : projects.length === 0 ? (
            <li className="p-4 text-center text-gray-500 text-sm">
              No projects yet.
            </li>
          ) : (
            projects.map((project) => (
              <li
                key={project._id}
                className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  currentProject?._id === project._id
                    ? "bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : "hover:bg-gray-800 border border-transparent"
                }`}
                onClick={() => onProjectSelect(project)}
              >
                <div className="flex-1 min-w-0 pr-8">
                  <div
                    className={`text-sm font-medium truncate ${currentProject?._id === project._id ? "text-blue-400" : "text-gray-300 group-hover:text-white"}`}
                  >
                    {project.name &&
                    !project.name.includes("dateOfProjectCreation")
                      ? project.name
                      : project.description
                        ? project.description.substring(0, 50) +
                          (project.description.length > 50 ? "..." : "")
                        : `Project ${new Date(project.createdAt).toLocaleDateString()}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className={`absolute right-3 p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 ${deletingId === project._id ? "opacity-100" : ""}`}
                  onClick={(e) => handleDeleteProject(project._id, e)}
                  disabled={deletingId === project._id}
                  title="Delete Project"
                >
                  {deletingId === project._id ? (
                    <i className="fas fa-spinner fa-spin text-red-500"></i>
                  ) : (
                    <i className="fas fa-trash text-sm"></i>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950/50 mt-auto">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-700 text-gray-300 font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProjectSidebar;
