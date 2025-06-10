// backend/src/middlewares/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error('중앙 에러 핸들러:', err);

  // Axios 에러인 경우 Riot API로부터 받은 에러 정보를 사용
  if (err.isAxiosError && err.response) {
    const { status, data } = err.response;
    let message = `Riot API 에러 (Status: ${status})`;

    // Riot API 에러 코드에 따른 메시지 분기
    if (status === 401) message = 'Riot API 인증에 실패했습니다. API 키를 확인하세요.';
    if (status === 403) message = 'Riot API 키가 만료되었거나 권한이 없습니다.';
    if (status === 404) message = '요청한 데이터를 찾을 수 없습니다.';
    
    return res.status(status).json({ error: message, details: data });
  }

  // 그 외 서버 내부 에러
  res.status(500).json({ error: '서버 내부에서 알 수 없는 에러가 발생했습니다.' });
};

export default errorHandler;