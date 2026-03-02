import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient, ApiClientContext } from './api/client';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
});

function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessTokenSilently } = useAuth0();
  const client = useMemo(
    () => new ApiClient(getAccessTokenSilently),
    [getAccessTokenSilently]
  );
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <App />
        </ApiProvider>
      </QueryClientProvider>
    </Auth0Provider>
  </StrictMode>
);
