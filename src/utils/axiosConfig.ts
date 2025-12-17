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
        // タイトル画面にリダイレクト
        window.location.href = '/title';
      }
      return Promise.reject(error);
    }
  );
}
