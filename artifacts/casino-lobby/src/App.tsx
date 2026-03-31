import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/use-auth-store";
import { PWAInstallPrompt } from "@/components/casino/PWAInstallPrompt";
import { LiveChat } from "@/components/casino/LiveChat";
import Lobby from "./pages/Lobby";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Bonus from "./pages/Bonus";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token, user } = useAuthStore();
  if (!token || !user) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { token, user } = useAuthStore();
  if (!token || !user) {
    return <Redirect to="/login" />;
  }
  if (user.role !== "admin") {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { token, user } = useAuthStore();
  if (token && user) {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">{() => <GuestRoute component={Login} />}</Route>
      <Route path="/register">{() => <GuestRoute component={Register} />}</Route>
      <Route path="/admin">{() => <AdminRoute component={Admin} />}</Route>
      <Route path="/bonus">{() => <ProtectedRoute component={Bonus} />}</Route>
      <Route path="/deposit">{() => <ProtectedRoute component={Deposit} />}</Route>
      <Route path="/withdraw">{() => <ProtectedRoute component={Withdraw} />}</Route>
      <Route path="/">{() => <ProtectedRoute component={Lobby} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <PWAInstallPrompt />
          <LiveChat />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
