const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function isGoogleConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

export function openGoogleSignIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const nonce = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
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
      localStorage.setItem("tk6699-google-pending", "1");
      window.location.href = url;
      reject(new Error("Popup blocked"));
      return;
    }

    let settled = false;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "google-auth-result") return;

      settled = true;
      window.removeEventListener("message", onMessage);
      clearInterval(closedCheck);

      if (event.data.idToken) {
        resolve(event.data.idToken);
      } else {
        reject(new Error(event.data.error || "No token received"));
      }
    };

    window.addEventListener("message", onMessage);

    const closedCheck = setInterval(() => {
      if (popup.closed && !settled) {
        settled = true;
        clearInterval(closedCheck);
        window.removeEventListener("message", onMessage);
        reject(new Error("Sign-in cancelled"));
      }
    }, 500);

    setTimeout(() => {
      if (!settled) {
        settled = true;
        clearInterval(closedCheck);
        window.removeEventListener("message", onMessage);
        if (!popup.closed) popup.close();
        reject(new Error("Sign-in timed out"));
      }
    }, 120000);
  });
}

export function handleGoogleRedirectResult(): string | null {
  const hash = window.location.hash;
  if (!hash.includes("id_token")) return null;

  const hashParams = new URLSearchParams(hash.substring(1));
  const idToken = hashParams.get("id_token");

  if (!idToken) return null;

  if (window.opener && window.opener !== window) {
    try {
      window.opener.postMessage(
        { type: "google-auth-result", idToken },
        window.location.origin
      );
      window.close();
      return null;
    } catch {
    }
  }

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  localStorage.removeItem("tk6699-google-pending");
  return idToken;
}
