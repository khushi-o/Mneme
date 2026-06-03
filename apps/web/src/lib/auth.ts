const ACCESS_KEY = "mneme_access_token";
const REFRESH_KEY = "mneme_refresh_token";

export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
};

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(tokens: TokenResponse) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(path, { ...init, headers });

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      res = await fetch(path, { ...init, headers });
    }
  }

  return res;
}

export async function refreshSession(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch("/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const tokens = (await res.json()) as TokenResponse;
  saveTokens(tokens);
  return true;
}

export async function requestMagicLink(email: string) {
  const res = await fetch("/v1/auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.title ?? "Could not send magic link");
  }
  return res.json() as Promise<{ message: string; dev_magic_link?: string }>;
}

export async function verifyMagicLink(token: string) {
  const res = await fetch("/v1/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.title ?? "Invalid sign-in link");
  }
  const tokens = (await res.json()) as TokenResponse;
  saveTokens(tokens);
  return tokens;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await authFetch("/v1/auth/me");
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as AuthUser;
}

export async function logout() {
  const refresh = getRefreshToken();
  if (refresh) {
    await fetch("/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
  }
  clearTokens();
}

export function consumeVerifyTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return null;

  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  window.history.replaceState({}, "", url.pathname + url.search);
  return token;
}
