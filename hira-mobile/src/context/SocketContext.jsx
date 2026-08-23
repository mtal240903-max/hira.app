import { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";
import Constants from "expo-constants";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

const SOCKET_URL = Constants.expoConfig?.extra?.socketUrl || "http://localhost:5000";

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [, forceUpdate] = useState(0); // pour republier socketRef.current aux consommateurs

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const token = await AsyncStorage.getItem("hira_access_token");
      if (!token || cancelled) return;

      const socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;
      forceUpdate((n) => n + 1);

      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket doit être utilisé dans un <SocketProvider>");
  return ctx;
}
