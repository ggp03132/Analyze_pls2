from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from database import get_connection
from ai_module import analyze_parking_video, load_slots
import os
import shutil
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI()

# React 프론트엔드 (localhost:3000) 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# 임시 영상 저장 폴더 생성
UPLOAD_FOLDER = "temp_videos"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    file_path = ""
    PARKINGLOT_ID = 1
    try:
        # 1. 영상 파일 저장
        file_path = os.path.join(UPLOAD_FOLDER, "current.mp4")
        
        # 대용량 파일도 안전하게 저장하기 위해 shutil 사용 권장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"영상 저장 완료: {file_path}")

        # 2. AI 모듈로 분석 실행
        # 반환값 예시: {"spaces" : {1: True, 2: False, 3: True 등}, "vehicles" : {"car":차량수}}
        result = analyze_parking_video(file_path)  
        
        parking_spaces_result = result.get("spaces", {})
        vehicle_counts_result = result.get("vehicles", {})

        print(f"주차 공간 분석 결과: {parking_spaces_result}")
        print(f"차량 수 카운트 결과: {vehicle_counts_result}")

        # 3. DB 갱신
        conn = get_connection()
        if conn:
            cursor = conn.cursor()
            try:
                for parkingspace_id, occupied in parking_spaces_result.items():
                    occupied_int = int(occupied)
                    cursor.execute(
                        """INSERT INTO parkingspace (parkinglot_id, parkingspace_id, occupied, updated)
                        VALUES (%s, %s, %s, NOW())
                        ON DUPLICATE KEY UPDATE occupied = VALUES(occupied), updated = NOW()""",
                        (PARKINGLOT_ID, parkingspace_id, occupied_int)
                    )
                
                for vehicle_type, count in vehicle_counts_result.items():
                    cursor.execute(
                        """INSERT INTO vehicle (parkinglot_id, type, count) VALUES (%s, %s, %s)
                        ON DUPLICATE KEY UPDATE count = VALUES(count)""",
                        (PARKINGLOT_ID, vehicle_type, count)
                    )

                conn.commit()
                print("DB 업데이트 완료")

            except Exception as e:
                print(f"DB 쿼리 오류: {e}")
                conn.rollback()
            finally:
                cursor.close()
                conn.close()
        else:
            print("DB 연결 실패")

        # 4. 결과 반환 (React로 보냄)
        return {"message": "분석 완료", "result": result}

    except HTTPException as http_e:
        raise http_e

    except Exception as e:
        print(f"서버 내부 오류: {e}")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            print(f"임시 파일 삭제 완료: {file_path}")

        raise HTTPException(status_code=500, detail=f"서버 오류 발생: {e}")
    
model = YOLO("best.pt")
slots = load_slots("slots.csv")


def draw_overlay(frame, car_boxes, slots):
    """차량 박스 + 슬롯 표시"""
    # 슬롯 표시
    for idx, pts in enumerate(slots):
        pts_np = np.array(pts, dtype=np.int32)
        cv2.polylines(frame, [pts_np], True, (0, 255, 0), 2)
        cv2.putText(frame, str(idx + 1), pts[0], cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)

    # 차량 박스 표시
    for (x1, y1, x2, y2) in car_boxes:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0,0,255), 2)

    return frame


@app.get("/stream")
def stream_video():
    video_path = os.path.join(UPLOAD_FOLDER, "current.mp4")

    # 영상 존재 확인
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="분석 중인 영상이 없습니다.")

    cap = cv2.VideoCapture(video_path)

    def generate():
        while True:
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

            # 프레임 전송
            _, jpeg = cv2.imencode(".jpg", frame)
            frame_bytes = jpeg.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )



@app.get("/parking_spaces")
def get_parking_spaces():
    conn = get_connection()
    if conn is None:
        return {"error": "DB 연결 실패"}

    cursor = conn.cursor(dictionary=True)

    try:
        # 1. 주차공간 정보 가져오기
        cursor.execute("SELECT parkingspace_id AS id, occupied FROM parkingspace")
        spaces = cursor.fetchall()
        
        # 2. 차량수 정보 가져오기
        cursor.execute("SELECT type, count FROM vehicle")
        vehicles = cursor.fetchall()

        slots = load_slots("slots.csv")
        
        return {
            "spaces": spaces,
            "vehicles": vehicles,
            "slots": {idx+1: slot for idx, slot in enumerate(slots)}
        }
    except Exception as e:
        print(f"DB 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {e}")
    finally:
        cursor.close()
        conn.close()