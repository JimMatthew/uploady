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
  /**
   * @param {string} message Human-readable error message.
   * @param {number} status HTTP status code, or 0 for a network failure.
   * @param {Object|null} data Parsed response body, if available.
   */
  constructor(message, status, data = null) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const getToken = () => localStorage.getItem("token");

/**
 * Performs an HTTP request and normalizes the response.
 *
 * Successful JSON responses are parsed and returned automatically.
 * Blob responses are returned when `expectBlob` is true.
 *
 * Failed HTTP responses are converted into {@link ApiError}.
 * The error message is chosen from, in order:
 *
 * 1. `data.error`
 * 2. `data.message`
 * 3. HTTP status text
 * 4. `"Request failed: <status>"`
 *
 * Network failures throw an ApiError with status `0`.
 *
 * Authentication is added automatically when a JWT exists in
 * localStorage.
 *
 * @param {string} url Request URL.
 * @param {RequestInit} [options={}] Fetch options.
 * @param {boolean} [expectBlob=false] Return the response as a Blob instead of JSON.
 * @returns {Promise<Object|Blob>} Parsed JSON response or Blob.
 * @throws {ApiError} When the request fails.
 */
const request = async (
  url,
  options = {},
  { responseType = "json" } = {},
) => {
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

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Unable to connect to server",
      0,
      null,
    );
  }

  if (!isLoginRequest && response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/";
    throw new ApiError("Unauthorized", 401);
  }
  if (!response.ok) {
    let data = null;

    try {
      data = await response.json();
    } catch {
      // Response wasn't JSON.
    }

    const message =
      data?.error ||
      data?.message ||
      response.statusText ||
      `Request failed: ${response.status}`;

    throw new ApiError(
      message,
      response.status,
      data,
    );
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
      return response.json();
  }
};

/**
 * Sends a GET request and returns the parsed JSON response.
 *
 * @param {string} url Request URL.
 * @param {RequestInit} [options={}] Additional fetch options.
 * @returns {Promise<Object>}
 * @throws {ApiError}
 *
 * @example
 * const data = await apiClient.get("/api/links");
 */
const get = (url, options = {}) =>
  request(url, {
    ...options,
    method: "GET",
  });

/**
 * Sends a JSON POST request.
 *
 * The body is automatically serialized with JSON.stringify().
 *
 * @param {string} url Request URL.
 * @param {Object} body JSON request body.
 * @param {RequestInit} [options={}] Additional fetch options.
 * @returns {Promise<Object>} Parsed JSON response.
 * @throws {ApiError}
 *
 * @example
 * const data = await apiClient.post("/apilogin", {
 *   username,
 *   password,
 * });
 */
const post = (url, body, options = {}) => {
  return request(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
};

/**
 * Sends a GET request and returns the response body as a Blob.
 *
 * Useful for authenticated file downloads.
 *
 * @param {string} url Request URL.
 * @param {RequestInit} [options={}] Additional fetch options.
 * @returns {Promise<Blob>}
 * @throws {ApiError}
 *
 * @example
 * const blob = await apiClient.getBlob("/api/download/file");
 */
const getBlob = (url, options = {}) =>
  request(
    url,
    {
      ...options,
      method: "GET",
    },
    { responseType: "blob" },
  );

/**
 * Sends a DELETE request.
 *
 * @param {string} url Request URL.
 * @param {RequestInit} [options={}] Additional fetch options.
 * @returns {Promise<Object>} Parsed JSON response.
 * @throws {ApiError}
 */
const del = (url, options = {}) => {
  return request(url, {
    ...options,
    method: "DELETE",
  });
};

/**
 * Sends a POST request and returns the response body as a Blob.
 *
 * @param {string} url Request URL.
 * @param {Object} body JSON request body.
 * @param {RequestInit} [options={}] Additional fetch options.
 * @returns {Promise<Blob>}
 * @throws {ApiError}
 */
const postBlob = (url, body, options = {}) => {
  return request(
    url,
    {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    },
    true,
  );
};

const getArrayBuffer = (url, options = {}) =>
  request(
    url,
    {
      ...options,
      method: "GET",
    },
    { responseType: "arrayBuffer" },
  );

const getResponse = (url, options = {}) =>
  request(
    url,
    {
      ...options,
      method: "GET",
    },
    { responseType: "response" },
  );

const postForm = (url, formData, options = {}) =>
  request(url, {
    ...options,
    method: "POST",
    body: formData,
  });

export { ApiError };

export default {
  request,
  get,
  post,
  getBlob,
  postBlob,
  delete: del,
  getArrayBuffer,
  getResponse,
  postForm,
};