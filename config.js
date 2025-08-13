// Put your Google Places API key here (optional).
const GOOGLE_API_KEY = ""; // キー未設定ならサンプルJSONで動作

// Default query used when key is present
const DEFAULT_QUERY = {
  keyword: "ディナー",
  location: { lat: 35.68944, lng: 139.70056 }, // 新宿近辺
  radius: 1500,
};
