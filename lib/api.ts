import type { PortfolioContent } from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5103";

export async function login(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error(await getErrorMessage(response, "Login failed"));

  return (await response.json()) as { token: string };
}

export async function registerAdmin(email: string, password: string, apiKey: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-API-Key": apiKey,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error(await getErrorMessage(response, "Registration failed"));
}

export async function requestApiKeyOtp(email: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/api-key/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) throw new Error(await getErrorMessage(response, "OTP request failed"));
}

export async function regenerateApiKey(email: string, otp: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/api-key/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) throw new Error(await getErrorMessage(response, "API key regeneration failed"));

  return (await response.json()) as { apiKey: string };
}

export async function getPortfolio() {
  const response = await fetch(`${apiBaseUrl}/api/portfolio`, { cache: "no-store" });
  if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to load portfolio"));
  return (await response.json()) as Partial<PortfolioContent>;
}

export async function saveSection(section: string, value: unknown, token: string) {
  const response = await fetch(`${apiBaseUrl}/api/admin/portfolio/${section}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(value),
  });

  if (!response.ok) throw new Error(await getErrorMessage(response, "Save failed"));
}

export async function uploadMedia(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}/api/admin/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) throw new Error(await getErrorMessage(response, "Upload failed"));

  return (await response.json()) as { url: string; key: string };
}

async function getErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.detail) return body.detail;
    if (body?.error) return body.error;
    if (body?.title) return body.title;
  }

  const text = await response.text().catch(() => "");
  return text || `${fallback} (${response.status})`;
}
