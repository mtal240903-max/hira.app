import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useAuth } from "../context/AuthContext";
import AuthScreen from "../screens/AuthScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import NewChatScreen from "../screens/NewChatScreen";
import NewGroupScreen from "../screens/NewGroupScreen";
import GroupInfoScreen from "../screens/GroupInfoScreen";
import ProfileScreen from "../screens/ProfileScreen";
import StatusViewerScreen from "../screens/StatusViewerScreen";
import CreateStatusScreen from "../screens/CreateStatusScreen";

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [Linking.createURL("/"), "hira://"],
  config: {
    screens: {
      AuthWuroenCallback: "auth/wuroen",
    },
  },
};

export default function RootNavigator() {
  const { user, isLoading, loginWithWuroen } = useAuth();

  // Écoute les deep links entrants même si l'app est déjà ouverte
  useEffect(() => {
    const handleUrl = async ({ url }) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.token) {
        try {
          await loginWithWuroen(queryParams.token);
        } catch (err) {
          console.error("Échec connexion Wuro'en :", err.message);
        }
      }
    };

    const sub = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => sub.remove();
  }, [loginWithWuroen]);

  if (isLoading) return null;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="StatusViewer" component={StatusViewerScreen} options={{ presentation: "fullScreenModal", animation: "fade" }} />
            <Stack.Screen name="CreateStatus" component={CreateStatusScreen} options={{ presentation: "modal" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
