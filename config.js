// Put your Google Places API key here (optional).
const GOOGLE_API_KEY = "AIzaSyCmfJuGWh547uTCQelDizJ5ipYK2PopkfY"; // ← ここにキー（未設定ならサンプルで動作）

// Default query used when key is present
const DEFAULT_QUERY = {
  keyword: "ディナー",
  // 旧形式でもOK（script側で変換）
  location: { lat: 35.68944, lng: 139.70056 }, // 新宿近辺
  // 新形式で指定するなら： location: { latitude: 35.68944, longitude: 139.70056 },
  radius: 1500,
};
