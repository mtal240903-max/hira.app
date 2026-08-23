import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import { CallProvider } from "./src/context/CallContext";
import RootNavigator from "./src/navigation/RootNavigator";
import IncomingCallBanner from "./src/components/IncomingCallBanner";
import ActiveCallScreen from "./src/components/ActiveCallScreen";

// Les composants globaux d'appel doivent être montés SOUS AuthProvider et
// SocketProvider (dont ils dépendent), donc dans un composant séparé plutôt
// que directement dans App() où ces contextes ne sont pas encore disponibles.
function AppContent() {
  const { user } = useAuth();
  const { themeName } = useTheme();

  if (!user) {
    return (
      <>
        <RootNavigator />
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      </>
    );
  }

  return (
    <SocketProvider>
      <CallProvider>
        <RootNavigator />
        <IncomingCallBanner />
        <ActiveCallScreen />
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      </CallProvider>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
