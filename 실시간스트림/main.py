from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from database import get_connection
from ai_module import load_slots
import os
import shutil
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

UPLOAD_FOLDER = "temp_videos"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# YOLO 모델 로드
model = YOLO("best.pt")
slots = load_slots("parking_slots.csv")  # 슬롯 좌표 불러오기

# 파일 업로드
@app.post("/analyze")
async def upload_video(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, "current.mp4")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"message": "영상 업로드 완료", "file": "current.mp4"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 실패: {e}")


# 영상에 박스 색 표시
def draw_overlay(frame, car_boxes, slots):
    for idx, pts in enumerate(slots):
        pts_np = np.array(pts, dtype=np.int32)
        occupied = False
        for (x1, y1, x2, y2) in car_boxes:
            cx, cy = (x1 + x2)//2, (y1 + y2)//2
            if cv2.pointPolygonTest(pts_np, (cx, cy), False) >= 0:
                occupied = True
                break

        slot_color = (0, 0, 255) if occupied else (0, 255, 0)  # 점유슬롯 빨강, 빈 슬롯 초록
        cv2.polylines(frame, [pts_np], True, slot_color, 2)
        cv2.putText(frame, str(idx + 1), pts[0], cv2.FONT_HERSHEY_SIMPLEX, 0.6, slot_color, 2)

    # 차량 박스
    for (x1, y1, x2, y2) in car_boxes:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)  # 노란박스

    return frame



# 실시간 스트리밍, 분석
@app.get("/stream")
def stream_video():
    video_path = os.path.join(UPLOAD_FOLDER, "current.mp4")

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="업로드된 영상이 없습니다.")

    cap = cv2.VideoCapture(video_path)

    def generate():
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # YOLO 감지
            results = model.predict(frame, imgsz=1280, conf=0.25, classes=[0], verbose=False)

            car_boxes = []
            for r in results:
                for box in r.boxes.xyxy.tolist():
                    x1, y1, x2, y2 = map(int, box)
                    car_boxes.append((x1, y1, x2, y2))

            # 시각화
            frame = draw_overlay(frame, car_boxes, slots)

            # JPEG 변환
            _, jpeg = cv2.imencode(".jpg", frame)
            frame_bytes = jpeg.tobytes()

            # 스트림 전송
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# 결과 반환 (차량, 슬롯)
@app.get("/parking_spaces")
def parking_spaces():
    video_path = os.path.join(UPLOAD_FOLDER, "current.mp4")

    if not os.path.exists(video_path):
        return {"vehicles": [{"type": "car", "count": 0}],
                "spaces": [{"id": i+1, "occupied": 0} for i in range(len(slots))]}

    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()  # 첫 프레임만 분석 / 실시간으로 바뀌게 하려면 뭐가 더 필요한듯
    cap.release()

    if not ret:
        return {"vehicles": [{"type": "car", "count": 0}],
                "spaces": [{"id": i+1, "occupied": 0} for i in range(len(slots))]}

    results = model.predict(frame, imgsz=1280, conf=0.25, classes=[0], verbose=False)
    car_boxes = []
    for r in results:
        for box in r.boxes.xyxy.tolist():
            x1, y1, x2, y2 = map(int, box)
            car_boxes.append((x1, y1, x2, y2))

    # 슬롯별 점유 확인
    spaces_status = []
    for idx, pts in enumerate(slots):
        pts_np = np.array(pts, dtype=np.int32)
        occupied = 0
        for (x1, y1, x2, y2) in car_boxes:
            cx, cy = (x1 + x2)//2, (y1 + y2)//2
            if cv2.pointPolygonTest(pts_np, (cx, cy), False) >= 0:
                occupied = 1
                break
        spaces_status.append({"id": idx+1, "occupied": occupied})

    return {
        "vehicles": [{"type": "car", "count": len(car_boxes)}],
        "spaces": spaces_status
    }
