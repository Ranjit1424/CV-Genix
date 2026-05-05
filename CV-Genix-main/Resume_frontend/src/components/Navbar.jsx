import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  getCurrentSession,
  logoutCurrentSession,
} from "../utils/localAuth";

const navLinks = [
  { to: "/services", label: "Features" },
  { to: "/email-generator", label: "Email Writer" },
  { to: "/placement-opportunities", label: "Opportunities" },
  { to: "/interview-prep", label: "Interview Prep" },
  { to: "/rate-resume", label: "ATS Review" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function Navbar() {
  const [session, setSession] = useState(() => getCurrentSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(getCurrentSession());
    };

    syncSession();
    window.addEventListener("authchange", syncSession);

    return () => window.removeEventListener("authchange", syncSession);
  }, []);

  const handleLogout = async () => {
    await logoutCurrentSession();
  };

  const navClassName = ({ isActive }) =>
    `rounded-full px-4 py-2 transition ${
      isActive
        ? "bg-white/12 text-white"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="navbar mx-auto max-w-7xl px-4 text-slate-100 lg:px-8">
        <div className="navbar-start">
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost border-0 text-slate-100 hover:bg-white/10 lg:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h8m-8 6h16"
                />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content z-[1] mt-3 w-52 rounded-2xl border border-white/10 bg-slate-900/95 p-2 text-slate-100 shadow-2xl backdrop-blur-xl"
            >
              {navLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
              {session ? (
                <li>
                  <Link to={"/profile"}>Profile</Link>
                </li>
              ) : null}
            </ul>
          </div>
          <Link
            to={"/"}
            className="btn btn-ghost h-auto border-0 px-2 text-slate-100 hover:bg-transparent"
          >
            <div className="text-left leading-tight">
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">
                Resume Studio
              </div>
              <div className="text-lg font-semibold tracking-wide text-slate-100">
                AI Resume Maker
              </div>
            </div>
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal gap-2 px-1 text-sm">
            {navLinks.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navClassName}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            {session ? (
              <li>
                <NavLink to="/profile" className={navClassName}>
                  Profile
                </NavLink>
              </li>
            ) : null}
          </ul>
        </div>
        <div className="navbar-end gap-2">
          {session ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="btn btn-ghost rounded-full border-0 text-slate-100 hover:bg-white/10"
              >
                {session.name}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn rounded-full border border-cyan-400/40 bg-cyan-400/10 px-5 text-sm font-medium text-cyan-100 hover:border-cyan-300 hover:bg-cyan-300/20"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="btn rounded-full border border-white/10 bg-white/10 px-5 text-sm font-medium text-slate-100 hover:border-cyan-300/40 hover:bg-white/20"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;
