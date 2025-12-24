import axios from 'axios';

// Axiosインターセプターを設定してAuthorizationヘッダーを自動追加
export function setupAxiosInterceptors() {
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 認証エラーの場合はローカルストレージをクリア
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        // カスタムイベントを発火してAuthContextに通知
        window.dispatchEvent(new Event('auth:logout'));
      }
      return Promise.reject(error);
    }
  );
}
