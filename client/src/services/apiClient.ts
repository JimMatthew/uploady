/**
 * Error thrown for failed API requests.
 *
 * `status` contains the HTTP status code when the server responded.
 * A status of `0` means no HTTP response was received, such as a
 * network failure or unreachable server.
 *
 * `data` contains the parsed JSON error response when available.
 *
 * @example
 * try {
 *   await apiClient.get("/api/links");
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     console.log(err.status);
 *     console.log(err.message);
 *     console.log(err.data);
 *   }
 * }
 */
class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type ResponseType = "json" | "blob" | "arrayBuffer" | "text" | "response";

interface ResponseOptions {
  responseType?: ResponseType;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

const getToken = (): string | null => localStorage.getItem("token");

/**
 * Performs an HTTP request and normalizes the response.
 *
 * Successful JSON responses are parsed and returned automatically.
 * Blob, ArrayBuffer, text, and raw Response objects are returned when
 * explicitly requested.
 *
 * Failed HTTP responses are converted into ApiError.
 *
 * Network failures throw an ApiError with status `0`.
 *
 * Authentication is added automatically when a JWT exists in
 * localStorage.
 */
const request = async <T = unknown>(
  url: string,
  options: RequestInit = {},
  { responseType = "json" }: ResponseOptions = {},
): Promise<T | Blob | ArrayBuffer | string | Response | null> => {
  const token = getToken();

  const headers = new Headers(options.headers);
  const isLoginRequest = url === "/apilogin";

  if (!isLoginRequest && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Let the browser set Content-Type + multipart boundary for FormData.
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Unable to connect to server", 0, null);
  }

  if (!isLoginRequest && response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/";

    throw new ApiError("Unauthorized", 401);
  }

  if (!response.ok) {
    let data: ApiErrorResponse | null = null;

    try {
      data = (await response.json()) as ApiErrorResponse;
    } catch {
      // Response wasn't JSON.
    }

    const message =
      data?.error ||
      data?.message ||
      response.statusText ||
      `Request failed: ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  if (response.status === 204) {
    return null;
  }

  switch (responseType) {
    case "blob":
      return response.blob();

    case "arrayBuffer":
      return response.arrayBuffer();

    case "text":
      return response.text();

    case "response":
      return response;

    default:
      return response.json() as Promise<T>;
  }
};

/**
 * Sends a GET request and returns the parsed JSON response.
 */
const get = async <T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  return request<T>(url, {
    ...options,
    method: "GET",
  }) as Promise<T>;
};

/**
 * Sends a JSON POST request.
 *
 * The body is automatically serialized with JSON.stringify().
 */
const post = async <T = unknown>(
  url: string,
  body: unknown,
  options: RequestInit = {},
): Promise<T> => {
  return request<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<T>;
};

/**
 * Sends a JSON PATCH request.
 *
 * The body is automatically serialized with JSON.stringify().
 */
const patch = async <T = unknown>(
  url: string,
  body: unknown,
  options: RequestInit = {},
): Promise<T> => {
  return request<T>(url, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<T>;
};

/**
 * Sends a GET request and returns the response body as a Blob.
 *
 * Useful for authenticated file downloads.
 */
const getBlob = async (
  url: string,
  options: RequestInit = {},
): Promise<Blob> => {
  return request(
    url,
    {
      ...options,
      method: "GET",
    },
    {
      responseType: "blob",
    },
  ) as Promise<Blob>;
};

/**
 * Sends a DELETE request.
 */
const del = async <T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  return request<T>(url, {
    ...options,
    method: "DELETE",
  }) as Promise<T>;
};

/**
 * Sends a POST request and returns the response body as a Blob.
 */
const postBlob = async (
  url: string,
  body: unknown,
  options: RequestInit = {},
): Promise<Blob> => {
  return request(
    url,
    {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    },
    {
      responseType: "blob",
    },
  ) as Promise<Blob>;
};

/**
 * Sends a GET request and returns the response body as an ArrayBuffer.
 */
const getArrayBuffer = async (
  url: string,
  options: RequestInit = {},
): Promise<ArrayBuffer> => {
  return request(
    url,
    {
      ...options,
      method: "GET",
    },
    {
      responseType: "arrayBuffer",
    },
  ) as Promise<ArrayBuffer>;
};

/**
 * Sends a GET request and returns the raw Fetch Response object.
 *
 * The response body is not consumed, allowing the caller to handle
 * streaming or choose how the response body should be read.
 */
const getResponse = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  return request(
    url,
    {
      ...options,
      method: "GET",
    },
    {
      responseType: "response",
    },
  ) as Promise<Response>;
};

/**
 * Sends a POST request with FormData as the request body.
 *
 * Content-Type is not set explicitly so the browser can generate the
 * multipart/form-data boundary automatically.
 */
const postForm = async <T = unknown>(
  url: string,
  formData: FormData,
  options: RequestInit = {},
): Promise<T> => {
  return request<T>(url, {
    ...options,
    method: "POST",
    body: formData,
  }) as Promise<T>;
};

export { ApiError };

export default {
  request,
  get,
  post,
  patch,
  getBlob,
  postBlob,
  delete: del,
  getArrayBuffer,
  getResponse,
  postForm,
};
