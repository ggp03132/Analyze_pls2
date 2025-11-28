import React, { useState } from "react";
import "./App.css"; // CSS 불러오기

function App() {
  const [carCount, setCarCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [memo, setMemo] = useState("");
  const [activeMenu, setActiveMenu] = useState("analysis");
  const [isAnalysisStarted, setIsAnalysisStarted] = useState(false);
  // 🚀 추가: 전체 주차 슬롯 수 상태
  const [totalSlots] = useState(180);

  // 데이터 모킹
  const [records] = useState(
    Array.from({ length: 27 }, (_, i) => ({
      id: i + 1,
      title: `주차장 영상 ${i + 1}`,
      content: `혼잡도 분석 결과 ${i + 1}`,
      date: `2025-11-${String((i % 30) + 1).padStart(2, "0")}`,
    }))
  );

  // 페이지네이션 로직
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRecords = records.slice(startIndex, startIndex + itemsPerPage);

  // 남은 슬롯 수 계산
const remainingSlots = totalSlots - carCount;
// 혼잡도 상태 계산 (예시)
const congestionStatus = 
    carCount / totalSlots > 0.8 ? '매우 혼잡' : 
    carCount / totalSlots > 0.5 ? '혼잡' : 
    '원활';

  // 파일 변경 핸들러
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFileName(file.name);

    setMemo((prev) =>
      prev
        ? `선택된 파일: ${file.name}\n${prev}`
        : `선택된 파일: ${file.name}`
    );

    // 이미지 (image/) 또는 영상 (video/) 파일인 경우 URL 생성
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      // 그 외 파일 형식은 미리보기 URL 초기화
      setPreviewUrl(null); 
    }
  };

  return (
    <div className="app">
      
      <aside className="sidebar">
        <div className="logo">분석해죠</div>
        <nav className="menu">
          <button
            className={`menu-item ${
              activeMenu === "analysis" ? "active" : ""
            }`}
            onClick={() => setActiveMenu("analysis")}
          >
            영상 분석
          </button>
          <button
            className={`menu-item ${activeMenu === "list" ? "active" : ""}`}
            onClick={() => setActiveMenu("list")}
          >
            분석 목록
          </button>
        </nav>
      </aside>

      
      <main className="main">
        
        <header className="hero">
          <img
            className="hero-bg"
            src="https://images.pexels.com/photos/1004409/pexels-photo-1004409.jpeg"
            alt="주차장 배경"
          />
          <h1 className="hero-title">영상 분석</h1>
        </header>

        {/* 🚀 오류 수정: 삼항 연산자 시작점. analysis 메뉴 렌더링 */}
        {activeMenu === "analysis" ? (
          <>
            <section className="top-section">
              
              <div className="card preview-card">
                
                {/* 파일이 선택되었을 때 파일 이름 확인 문구 표시 */}
                {selectedFileName && (
                  <div className="file-info-overlay">
                    <p>✅ 업로드한 파일 확인: **{selectedFileName}**</p>
                  </div>
                )}

                {previewUrl ? (
                  // 파일 타입에 따라 <video> 또는 <img> 렌더링을 결정합니다.
                  selectedFileName.match(/\.(mp4|mov|avi|wmv|webm)$/i) ? (
                    // 비디오 태그: 컨트롤, 자동 재생, 음소거 속성 추가
                    <video 
                        src={previewUrl} 
                        controls 
                        autoPlay 
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    // 이미지 태그
                    <img
                      src={previewUrl}
                      alt="미리보기"
                    />
                  )
                ) : (
                // 파일이 없을 경우 안내 문구 표시
                  <div className="preview-placeholder">
                        <p>여기에 영상 미리보기가 표시됩니다.</p>
                        <p className="small-text">지원 형식: MP4, AVI, JPG, PNG 등</p>
                    </div>
                )}
              </div>

              
              <div className="card form-card">
                <div className="form-group">
                  <label>주차장 제목</label>
                  <input placeholder="제목을 입력해주세요." />
                </div>

                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                
                <div className="button-row">
                  <div className="button-group">
                    <label htmlFor="file-input" className="btn primary">
                      🎥 영상 업로드
                    </label>

                    <button
                      className="btn secondary"
                      onClick={() => setCarCount((c) => c + 1)}
                    >
                      ⏱ 분석 시작
                    </button>
                  </div>
                </div>
              </div>
            </section>

            
            <section className="card result-card">
              {/* 🚀 주차장 슬롯 현황 및 혼잡도 표시 */}
              <div className="result-box result-box-left">
                <h3> 🅿️ 주차장 공간 현황 </h3>
                
                <p>
                    총 공간 : {totalSlots}대 / 
                    남은 공간 : <span style={{ color: remainingSlots <= 5 ? 'red' : 'green', fontWeight: 'bold' }}>{remainingSlots}대</span>
                </p>
                <p>
                    현재 혼잡도: {congestionStatus}
                </p>
              </div>

              {/* 🚀 현재 차량 수 표시 */}
              <div className="result-box result-box-right">
                <h3> 🚗 현재 차량 수</h3>
                <p className="large-count">{carCount}대</p>
              </div>
            </section>
    
          </>
        ) : (
          /* list 메뉴 렌더링 */
          <>
            
            <section className="card history-card">
              <h2>분석 목록</h2>
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>제목</th>
                    <th>내용</th>
                    <th>분석날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.title}</td>
                      <td>{r.content}</td>
                      <td>{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                >
                  이전
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;