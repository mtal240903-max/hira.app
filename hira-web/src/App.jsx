import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import { CallProvider } from "./context/CallContext";
import AuthPage from "./pages/AuthPage";
import WuroenCallbackPage from "./pages/WuroenCallbackPage";
import ChatPage from "./pages/ChatPage";

function PrivateRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route path="/auth/wuroen/callback" element={<WuroenCallbackPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <SocketProvider>
              <CallProvider>
                <ChatPage />
              </CallProvider>
            </SocketProvider>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
