const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function isGoogleConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

export function openGoogleSignIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const nonce = Math.random().toString(36).slice(2);
    const state = Math.random().toString(36).slice(2);

    sessionStorage.setItem("google_oauth_state", state);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      state,
      prompt: "select_account",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      url,
      "google-signin",
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!popup) {
      window.location.href = url;
      reject(new Error("Popup blocked"));
      return;
    }

    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error("Sign-in cancelled"));
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl.startsWith(redirectUri)) {
          clearInterval(interval);
          popup.close();

          const hash = popup.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          const idToken = hashParams.get("id_token");
          const returnedState = hashParams.get("state");
          const savedState = sessionStorage.getItem("google_oauth_state");

          if (returnedState !== savedState) {
            reject(new Error("State mismatch"));
            return;
          }

          if (idToken) {
            resolve(idToken);
          } else {
            reject(new Error("No token received"));
          }
        }
      } catch {
      }
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      if (!popup.closed) popup.close();
      reject(new Error("Sign-in timed out"));
    }, 120000);
  });
}

export function handleGoogleRedirectResult(): string | null {
  const hash = window.location.hash;
  if (!hash.includes("id_token")) return null;

  const hashParams = new URLSearchParams(hash.substring(1));
  const idToken = hashParams.get("id_token");
  const returnedState = hashParams.get("state");
  const savedState = sessionStorage.getItem("google_oauth_state");

  if (returnedState && savedState && returnedState !== savedState) return null;

  if (idToken) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return idToken;
  }

  return null;
}
