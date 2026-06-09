export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
};

export type SessionResponse = {
  expires_in: number;
  user: AuthUser;
};

const fetchOpts: RequestInit = { credentials: "include" };

export async function authFetch(path: string, init: RequestInit = {}) {
  let res = await fetch(path, { ...fetchOpts, ...init });

  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await fetch(path, { ...fetchOpts, ...init });
    }
  }

  return res;
}

export async function refreshSession(): Promise<boolean> {
  const res = await fetch("/v1/auth/refresh", {
    method: "POST",
    ...fetchOpts,
  });

  if (!res.ok) return false;
  return true;
}

export async function requestMagicLink(email: string) {
  const res = await fetch("/v1/auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.title ?? "Invalid sign-in link");
  }
  const session = (await res.json()) as SessionResponse;
  return session;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await authFetch("/v1/auth/me");
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as AuthUser;
}

export async function logout() {
  await fetch("/v1/auth/logout", {
    method: "POST",
    ...fetchOpts,
  });
}

export async function addToLibrary(bookId: string) {
  const res = await authFetch("/v1/me/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_id: bookId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.title ?? "Could not add book");
  }
  const json = await res.json();
  return json.data;
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
