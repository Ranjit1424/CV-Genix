import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentSession } from "../../utils/localAuth";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getCurrentSession();

  if (!session?.sessionToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
