import { useState, useEffect } from "react";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";

const SplitContainer = ({
  currentProject,
  onProjectCreate,
  onProjectUpdate,
  tempMessages = [],
  isGenerating = false,
  isActive = false,
}) => {
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const container = document.getElementById("splitContainer");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;

      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;

      const container = document.getElementById("splitContainer");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newLeftWidth =
        ((e.touches[0].clientX - rect.left) / rect.width) * 100;

      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftPanelWidth(constrainedWidth);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDividerTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDividerDoubleClick = () => {
    // Reset to default 50/50 split
    setLeftPanelWidth(50);
  };

  return (
    <div
      className={`flex w-full h-full relative overflow-hidden transition-all duration-500 ease-in-out ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 hidden"}`}
      id="splitContainer"
    >
      <div
        style={{ width: `${leftPanelWidth}%` }}
        className="h-full border-r border-gray-800 bg-gray-900 flex-shrink-0 transition-all duration-75 relative z-10"
      >
        <LeftPanel
          currentProject={currentProject}
          onProjectCreate={onProjectCreate}
          onProjectUpdate={onProjectUpdate}
          width={100} // Let the parent control actual width
          tempMessages={tempMessages}
          isGenerating={isGenerating}
        />
      </div>

      {/* Draggable Divider */}
      <div
        className={`w-1.5 cursor-col-resize bg-gray-800 hover:bg-blue-500 active:bg-blue-600 transition-colors z-20 flex flex-col items-center justify-center -ml-px group ${isDragging ? "bg-blue-500" : ""}`}
        id="panelDivider"
        onMouseDown={handleDividerMouseDown}
        onTouchStart={handleDividerTouchStart}
        onDoubleClick={handleDividerDoubleClick}
      >
        <div className="flex items-center justify-center w-5 h-10 bg-gray-800 border border-gray-700 rounded-full shadow-md text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <i className="fas fa-grip-vertical text-[10px]"></i>
        </div>
      </div>

      <div
        style={{ width: `calc(${100 - leftPanelWidth}% - 6px)` }}
        className="h-full bg-gray-950 flex-1 min-w-0 transition-all duration-75 relative z-10"
      >
        <RightPanel
          currentProject={currentProject}
          width={100} // Let the parent control width
        />
      </div>
    </div>
  );
};

export default SplitContainer;
