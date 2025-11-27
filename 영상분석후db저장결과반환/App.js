import React, { useState } from "react";
import "./App.css"; // CSS 불러오기

function App() {
  const [carCount, setCarCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [activeMenu, setActiveMenu] = useState("analysis");
  // 🚀 추가: 전체 주차 슬롯 수 상태
  const [totalSlots] = useState(44);

  const [isLoading, setIsLoading] = useState(false); //로딩 확인
  const [analysisResult, setAnalysisResult] = useState(null); //결과 데이터

  const [slotShapes, setSlotShapes] = useState([]);
  const [showStream, setShowStream] = useState(false);

  // 페이지 용 데이터 더미
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
    carCount / totalSlots > 0.8
      ? "매우 혼잡"
      : carCount / totalSlots > 0.5
      ? "혼잡"
      : "원활";

  // 파일 변경 핸들러
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setSelectedFileName(file.name);

    // 이미지 (image/) 또는 영상 (video/) 파일인 경우 URL 생성
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      // 그 외 파일 형식은 미리보기 URL 초기화
      setPreviewUrl(null);
    }
  };

  //fastAPI 서버로 전송 및 분석 요청
  const handleAnalysis = async () => {
    if (!selectedFile) {
      alert("파일을 업로드해주세요.");
      return;
    }
    setShowStream(true); //실시간 확인용 스트림
    setIsLoading(true); //로딩
    setAnalysisResult(null); //전 결과 초기화

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("서버 통신 오류");
      }

      const data = await response.json();

      const spaces = data.result.spaces;
      const vehicles = data.result.vehicles;
      const slots = data.result.slots;

      const vehicleCount = vehicles.car ?? 0; //분석 결과 차량 수
      const emptySlots = Object.keys(spaces)
        .filter((key) => spaces[key] === false)
        .map(Number);
      const slotList = Object.keys(spaces).map((id) => ({
        id: Number(id),
        occupied: spaces[id],
        points: slots[id],
      }));

      //업데이트
      setCarCount(vehicleCount);
      setAnalysisResult({ spaces, vehicles, emptySlots });
      setSlotShapes(slotList);

      //setAnalysisResult(data.result);

      alert("분석 완료");
    } catch (error) {
      console.error("Error : ", error);
      alert("분석 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">분석해조</div>
        <nav className="menu">
          <button
            className={`menu-item ${activeMenu === "analysis" ? "active" : ""}`}
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
                      id="preview-video"
                      src={previewUrl}
                      controls
                      autoPlay
                      muted
                      //style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    // 이미지 태그
                    <img
                      src={previewUrl}
                      alt="미리보기"
                      style={{ width: "100%" }}
                    />
                  )
                ) : (
                  // 파일이 없을 경우 안내 문구 표시
                  <div className="preview-placeholder">
                    <p>여기에 영상 미리보기가 표시됩니다.</p>
                    <p className="small-text">
                      지원 형식: MP4, AVI, JPG, PNG 등
                    </p>
                  </div>
                )}
                             {" "}
              </div>

              {showStream && (
                <div
                  className="card"
                  style={{ marginTop: "20px", padding: "10px" }}
                >
                  <h3>🔍 실시간 분석 스트림</h3>
                  <img
                    key={Date.now()}
                    src="http://localhost:8000/stream"
                    alt="stream"
                    style={{
                      width: "100%",
                      maxHeight: "400px",
                      objectFit: "contain",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              )}

              <div className="control-container">
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
                        onClick={handleAnalysis}
                        disabled={isLoading}
                      >
                        {isLoading ? "⏳ 분석 중" : "⏱ 분석 시작"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 결과 영역 */}
                <div className="card result-card">
                  <div className="result-box">
                    <h3> 🅿️ 주차장 공간 현황 </h3>

                    <p>
                      총 공간 : {totalSlots}대 / 남은 공간 :{" "}
                      <span
                        style={{
                          color: remainingSlots <= 5 ? "red" : "green",
                          fontWeight: "bold",
                        }}
                      >
                        {remainingSlots}대
                      </span>
                    </p>
                    <p>현재 혼잡도: {congestionStatus}</p>

                    {analysisResult && (
                      <div style={{ marginTop: "15px" }}>
                        <h4>빈 슬롯 번호</h4>
                        {analysisResult.emptySlots.length > 0 ? (
                          <p>{analysisResult.emptySlots.join(", ")}</p>
                        ) : (
                          <p>빈 슬롯 없음</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* 🚀 현재 차량 수 표시 */}
                  <div className="result-box result-box-right">
                    <h3> 🚗 현재 차량 수</h3>
                    <p className="large-count">{carCount}대</p>
                  </div>
                </div>
              </div>
            </section>

            {analysisResult && slotShapes.length > 0 && (
              <section
                className="card slot-table-card"
                style={{ marginTop: "20px" }}
              >
                <h3>🅿️ 주차장 슬롯 상세 현황</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)", // 한 줄에 12개
                    gap: "8px", // 슬롯 간격
                  }}
                >
                  {slotShapes.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        borderRadius: "4px",
                        backgroundColor: slot.occupied ? "#f8d7da" : "#d4edda", // 점유는 빨강, 빈 슬롯은 초록
                        color: slot.occupied ? "red" : "green",
                        fontWeight: "bold",
                      }}
                    >
                      {slot.id}
                    </div>
                  ))}
                </div>
              </section>
            )}
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
