import cv2
import csv
import numpy as np

# ==========================================
IMAGE_PATH = 'testimg/test1.jpg'        # 원본 이미지 파일
CSV_PATH = 'parking_slots.csv'  # 방금 만든 CSV 파일
# ==========================================

# 이미지 로드
img = cv2.imread(IMAGE_PATH)
if img is None:
    print(f"Error: {IMAGE_PATH} 이미지를 찾을 수 없습니다.")
    exit()

# CSV 파일 읽어서 그리기
with open(CSV_PATH, mode='r') as file:
    reader = csv.reader(file)
    header = next(reader) # 첫 줄(헤더) 건너뛰기
    
    count = 0
    for row in reader:
        # CSV 포맷: slot_id, x1, y1, x2, y2, x3, y3, x4, y4
        slot_id = row[0]
        
        # 좌표 데이터들을 정수형 리스트로 변환
        coords = list(map(int, row[1:]))
        
        # OpenCV 폴리곤 그리기에 맞는 형태로 변환 (N, 1, 2)
        pts = np.array(coords).reshape((-1, 1, 2))
        
        # 1. 사각형 그리기 (녹색)
        cv2.polylines(img, [pts], True, (0, 255, 0), 2)
        
        # 2. 슬롯 번호 표시 (중심점 계산) - 필요하면 주석 해제해서 보세요
        # center_x = int(np.mean(pts[:, :, 0]))
        # center_y = int(np.mean(pts[:, :, 1]))
        # cv2.putText(img, slot_id, (center_x - 10, center_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        count += 1

print(f"총 {count}개의 주차 슬롯을 표시했습니다.")

# 결과 이미지 띄우기
cv2.imshow("Parking Slot Result", img)
cv2.waitKey(0)
cv2.destroyAllWindows()