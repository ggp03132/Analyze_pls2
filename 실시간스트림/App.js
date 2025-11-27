import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [activeMenu, setActiveMenu] = useState("analysis");

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [showStream, setShowStream] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [carCount, setCarCount] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [slotShapes, setSlotShapes] = useState([]);
  const [totalSlots, setTotalSlots] = useState(203); // 기본값
  const [remainingSlots, setRemainingSlots] = useState(203);
  const [congestionStatus, setCongestionStatus] = useState("원활");

  const pollingRef = useRef(null);

  // 파일 선택
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setSelectedFileName(file.name);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // 분석 버튼 클릭
  const handleAnalysis = async () => {
    if (!selectedFile) {
      alert("파일을 업로드해주세요.");
      return;
    }

    setIsLoading(true);
    setShowStream(false);

    try {
      // 1) 영상 업로드
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("업로드 실패");
      await res.json();

      // 2) 스트림 보여주기
      setShowStream(true);

      // 3) 분석 결과
      startPolling();
    } catch (err) {
      console.error(err);
      alert("분석 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  // 폴링 시작
  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/parking_spaces");
        const data = await res.json();

        // 차량 수
        const vehicleCount = data.vehicles[0]?.count ?? 0;
        setCarCount(vehicleCount);

        // 슬롯 상태
        const spaces = data.spaces;
        setSlotShapes(spaces);

        const emptySlots = spaces
          .filter((s) => s.occupied === 0)
          .map((s) => s.id);
        setRemainingSlots(emptySlots.length);

        // 혼잡도 계산
        setTotalSlots(spaces.length);
        if (emptySlots.length / spaces.length <= 0.2)
          setCongestionStatus("매우 혼잡");
        else if (emptySlots.length / spaces.length <= 0.5)
          setCongestionStatus("혼잡");
        else setCongestionStatus("원활");

        setAnalysisResult({ emptySlots });
      } catch (err) {
        console.error(err);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

        {activeMenu === "analysis" ? (
          <>
            <section className="top-section">
              {/* 영상 미리보기 */}
              <div className="card preview-card">
                {showStream ? (
                  <img
                    key={Date.now()}
                    src="http://localhost:8000/stream"
                    alt="stream"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : previewUrl ? (
                  selectedFileName.match(/\.(mp4|mov|avi|wmv|webm)$/i) ? (
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      muted
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="미리보기"
                      style={{ width: "100%" }}
                    />
                  )
                ) : (
                  <div>
                    <p>여기에 영상 미리보기가 표시됩니다.</p>
                    <p className="small-text">
                      지원 형식: MP4, AVI, JPG, PNG 등
                    </p>
                  </div>
                )}
              </div>

              {/* 파일 업로드 + 분석 버튼 */}
              <div className="control-container">
                <div className="card form-card">
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
                        {analysisResult.emptySlots.length > 0
                          ? analysisResult.emptySlots.join(", ")
                          : "빈 슬롯 없음"}
                      </div>
                    )}
                  </div>

                  <div className="result-box result-box-right">
                    <h3> 🚗 현재 차량 수</h3>
                    <p className="large-count">{carCount}대</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 슬롯 상태 */}
            {analysisResult && slotShapes.length > 0 && (
              <section
                className="card slot-table-card"
                style={{ marginTop: "20px" }}
              >
                <h3>🅿️ 주차장 슬롯 상세 현황</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: "8px",
                  }}
                >
                  {slotShapes.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        borderRadius: "4px",
                        backgroundColor: slot.occupied ? "#f8d7da" : "#d4edda",
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
          /* 분석 목록 탭 */
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
                {/* 더미 데이터 */}
                {Array.from({ length: 10 }, (_, i) => (
                  <tr key={i + 1}>
                    <td>{i + 1}</td>
                    <td>주차장 영상 {i + 1}</td>
                    <td>혼잡도 분석 결과 {i + 1}</td>
                    <td>2025-11-{String((i % 30) + 1).padStart(2, "0")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
