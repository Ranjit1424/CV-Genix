import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
function Root() {
  return (
    <div className="app-shell">
      {/* navbar */}
      <Navbar />

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Root;
