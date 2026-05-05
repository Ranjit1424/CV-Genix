import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentSession } from "../../utils/localAuth";

function PublicOnlyRoute({ children }) {
  const location = useLocation();
  const session = getCurrentSession();
  const redirectPath = location.state?.from || "/profile";

  if (session?.sessionToken) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default PublicOnlyRoute;
