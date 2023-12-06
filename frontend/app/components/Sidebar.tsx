import React from "react";

const Sidebar = () => {
  return (
    <>
      <div className="w-1/4 h-full bg-black  p-4">
        <div className="">
          <button className="text-white border border-white rounded px-4 py-2 mb-4 hover:bg-white hover:text-gray-900 transition-colors">
            New Chat
          </button>
          <hr className="my-4" />
          <div>
            <p className="text-white py-2">Chat 1</p>
            <p className="text-white py-2">Chat 2</p>
            <p className="text-white py-2">Chat 3</p>
            <p className="text-white py-2">Chat 4</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
