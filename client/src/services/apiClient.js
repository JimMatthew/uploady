const getToken = () => localStorage.getItem("token");

const request = async (url, options = {}, expectBlob = false) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return expectBlob ? response.blob() : response.json();
};

const get = (url, options = {}) => {
  return request(url, {
    ...options,
    method: "GET",
  });
};

const post = (url, body, options = {}) => {
  return request(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
};

const getBlob = (url, options = {}) => {
  return request(
    url,
    {
      ...options,
      method: "GET",
    },
    true,
  );
};

export default {
  request,
  get,
  post,
  getBlob,
};