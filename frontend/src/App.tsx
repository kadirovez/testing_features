import { AuthScreen } from "./components/auth/AuthScreen";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { StoreProvider } from "./context/StoreContext";
import { ChatAppearanceProvider } from "./context/ChatAppearanceContext";
import { ThemeProvider } from "./context/ThemeContext";

function Gate() {
  const { status } = useAuth();
  if (status === "loading") return null;
  return status === "authed" ? <AppShell /> : <AuthScreen />;
}

export function App() {
  return (
    <ThemeProvider>
      <ChatAppearanceProvider>
        <LocaleProvider>
          <StoreProvider>
            <AuthProvider>
              <Gate />
            </AuthProvider>
          </StoreProvider>
        </LocaleProvider>
      </ChatAppearanceProvider>
    </ThemeProvider>
  );
}
