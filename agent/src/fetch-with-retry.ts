export async function fetchWithRetry(
  url: string | URL,
  options: RequestInit = {},
  retries = 3,
  delayMs = 1000,
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs);
    }
    throw error;
  }
}
