import React, { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";

const About = lazy(() => import("./pages/About"));
const Home = lazy(() => import("./pages/Home"));
const Root = lazy(() => import("./pages/Root"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const GenerateResume = lazy(() => import("./pages/GenerateResume"));
const EmailGenerator = lazy(() => import("./pages/EmailGenerator"));
const RateResume = lazy(() => import("./pages/RateResume"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const PlacementOpportunities = lazy(() => import("./pages/LiveJobsBoard"));
const InterviewQuestions = lazy(() => import("./pages/InterviewQuestions"));

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center px-6">
    <div className="status-banner status-banner-info max-w-xl w-full text-center">
      <div className="status-banner-title">Loading page</div>
      <p className="status-banner-copy">
        We are preparing the next screen for you.
      </p>
    </div>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
   <BrowserRouter>
      <Toaster />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Root />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="services" element={<Services />} />
            <Route path="contact" element={<Contact />} />
            <Route path="generate-resume" element={<GenerateResume />} />
            <Route path="email-generator" element={<EmailGenerator />} />
            <Route path="rate-resume" element={<RateResume />} />
            <Route path="placement-opportunities" element={<PlacementOpportunities />} />
            <Route path="interview-prep" element={<InterviewQuestions />} />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
