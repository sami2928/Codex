import React from "react";
import PropTypes from "prop-types";
import { cn } from "../lib/utils";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import { PenSquare } from "lucide-react";
const Sidebar = ({ isSidebarOpen, toggleSidebar, messages }) => {
  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-30 transform transition-transform",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          {/* Close Sidebar Icon */}
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={toggleSidebar}
          >
            <MenuBookIcon className="h-6 w-6" />
            <span className="sr-only">Close Sidebar</span>
          </button>

          {/* Search and New Chat Buttons */}
          <div className="flex items-center space-x-3">
            <button className="text-gray-500 hover:text-gray-700">
              <SearchIcon className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <PenSquare className="h-5 w-5" />
              <span className="sr-only">New Chat</span>
            </button>
          </div>
        </div>

        {/* New Chat Long Button */}
        <div className="p-2">
          <button
            className="w-[93%] bg-gray-500 py-2 px-4 mx-2 text-white hover:text-gray-700 focus:outline-none hover:outline-none transition-colors rounded-lg"
            onClick={() => console.log("New Chat Button Clicked")}
          >
            Codex Chat
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className="p-2 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => {
                console.log("Selected chat:", message);
              }}
            >
              <p className="text-sm text-gray-600 truncate">
                {message.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

Sidebar.propTypes = {
  isSidebarOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  messages: PropTypes.array.isRequired,
};

export default Sidebar;
