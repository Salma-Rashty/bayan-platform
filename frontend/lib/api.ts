const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// TODO(security): the auth token is kept in localStorage for simplicity. It is
// readable by any JS running on the page (XSS risk) and isn't sent automatically
// like a cookie would be. Once the backend can issue an httpOnly cookie session,
// move the token there instead.
const TOKEN_KEY = "bayan_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/**
 * Thrown for any non-2xx API response. `errors` is populated from Laravel's
 * standard 422 validation shape: { message, errors: { field: [messages] } }.
 */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  /** First validation message for a field, if any. */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers: headersInit, ...rest } = options;
  const token = getToken();

  const headers = new Headers(headersInit);
  headers.set("Accept", "application/json");
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data?.message as string | undefined) ?? "Something went wrong. Please try again.";
    throw new ApiError(message, res.status, data?.errors);
  }

  return data as T;
}

/**
 * POSTs multipart form data with upload progress (fetch can't report it), for large files.
 * Errors are thrown as ApiError, like the JSON helpers.
 */
export function apiUpload<T>(path: string, body: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${path}`);
    xhr.setRequestHeader("Accept", "application/json");
    const token = getToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new ApiError("Network error. Check your connection and try again.", 0));
    xhr.onload = () => {
      let data: { message?: string; errors?: Record<string, string[]> } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON (e.g. a proxy's 413 page) falls through to the status-based message.
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else if (xhr.status === 413) {
        reject(new ApiError("Your files are too large for the server to accept.", 413));
      } else {
        reject(new ApiError(data?.message ?? "Something went wrong. Please try again.", xhr.status, data?.errors));
      }
    };

    xhr.send(body);
  });
}

export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "DELETE" }),
};
