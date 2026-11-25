import React, { useEffect } from "react";
import { AppRouter } from "./routes/index.js";
import { useAuthStore } from "./stores/auth.store.js";

export const App: React.FC = () => {
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  return <AppRouter />;
};

export default App;
