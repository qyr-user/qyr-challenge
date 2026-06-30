import time
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

STRAVA_SESSION_COOKIE = "nvbdo9gmg92u3pli66tlgmcm9tc5k7l6"
CLUB_ID = "2224942"

def calculate_pace(distance_str, duration_str):
    try:
        dist_match = re.search(r"([0-9.,]+)", distance_str)
        if not dist_match:
            return "--:--"
        distance = float(dist_match.group(1).replace(",", "."))
        if distance == 0:
            return "--:--"

        total_seconds = 0
        hr_match = re.search(r"(\d+)\s*(?:giờ|h|hour)", duration_str, re.IGNORECASE)
        if hr_match:
            total_seconds += int(hr_match.group(1)) * 3600
            
        min_match = re.search(r"(\d+)\s*(?:phút|m|min)", duration_str, re.IGNORECASE)
        if min_match:
            total_seconds += int(min_match.group(1)) * 60
            
        sec_match = re.search(r"(\d+)\s*(?:giây|s|sec)", duration_str, re.IGNORECASE)
        if sec_match:
            total_seconds += int(sec_match.group(1))

        if total_seconds == 0:
            nums = re.findall(r"\d+", duration_str)
            if len(nums) >= 2:
                total_seconds = int(nums[0])*60 + int(nums[1])
            elif len(nums) == 1:
                total_seconds = int(nums[0])*60

        if total_seconds == 0:
            return "--:--"

        seconds_per_km = total_seconds / distance
        pace_minutes = int(seconds_per_km // 60)
        pace_seconds = int(round(seconds_per_km % 60))
        
        if pace_seconds == 60:
            pace_minutes += 1
            pace_seconds = 0

        return f"{pace_minutes}:{pace_seconds:02d} /km"
    except Exception:
        return "--:--"

def crawl_strava_all_runners():
    chrome_options = Options()
    chrome_options.add_argument("--window-size=1280,1000")
    chrome_options.add_argument("--ignore-certificate-errors")
    
    print("[1/4] Đang khởi tạo trình duyệt ảo...")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        driver.get("https://strava.com")
        time.sleep(1)
        driver.add_cookie({
            "name": "_strava4_session",
            "value": STRAVA_SESSION_COOKIE,
            "domain": ".strava.com",
            "path": "/"
        })

        club_url = f"https://strava.com/clubs/{CLUB_ID}/recent_activity"
        print(f"[2/4] Đang chuyển hướng tới Câu lạc bộ: {club_url}")
        driver.get(club_url)

        print("Đang chờ trang web tải dữ liệu chạy bộ (Tối đa 30 giây)...")
        WebDriverWait(driver, 30).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        time.sleep(4)

        # Cuộn chuột sâu 3 lần để Strava tải hết toàn bộ hoạt động trong ngày
        print("Đang tự động cuộn trình duyệt xuống để quét toàn bộ bài đăng...")
        for _ in range(3):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

        # CHIẾN THUẬT MỚI: Tìm TRỰC TIẾP thẻ header thông tin của từng VĐV đơn lẻ (Không phân biệt đơn hay nhóm)
        # Tất cả các bài chạy dù đơn hay nhóm đều có thẻ div mang thuộc tính data-testid="entry-header"
        runner_headers = driver.find_elements(By.XPATH, "//div[@data-testid='entry-header']")
        
        print(f"\n[3/4] Tiến hành bóc tách và lọc trùng chạy đơn/chạy nhóm ngày HÔM NAY:")
        print(f"{'VẬN ĐỘNG VIÊN':<20} | {'QUÃNG ĐƯỜNG':<12} | {'PACE (NHỊP ĐỘ)':<15} | {'THỜI GIAN':<15} | {'TÊN BUỔI CHẠY'}")
        print("-" * 105)

        total_runners = 0
        for header in runner_headers:
            try:
                # BƯỚC 1: Dò tìm thẻ thời gian <time> gần nhất bằng cách tìm ngược lên khối bài đăng cha
                # Khối bài đăng lớn bao bọc luôn là div có class chứa 'web-feed-entry' hoặc id 'feed-entry-'
                parent_entry = header.find_element(By.XPATH, "./ancestor::div[@data-testid='web-feed-entry' or contains(@id, 'feed-entry-')]")
                
                try:
                    time_element = parent_entry.find_element(By.XPATH, ".//time[@data-testid='date_at_time']")
                    run_time_text = time_element.text.strip().lower()
                except:
                    continue

                # Lọc: Chỉ lấy dữ liệu chạy của ngày "Hôm nay" hoặc "Today"
                if "hôm nay" not in run_time_text and "today" not in run_time_text:
                    continue

                # BƯỚC 2: Bóc tách dữ liệu của VĐV này
                # 1. Tên VĐV
                athlete_name = header.find_element(By.XPATH, ".//a[@data-testid='owners-name']").text.strip()
                if not athlete_name or athlete_name.lower() == "hồ sơ":
                    continue

                # Xác định vùng chứa chỉ số chạy (Quãng đường, Pace, Thời gian) tương ứng với người này
                # Đối với chạy nhóm, dữ liệu nằm chung trong thẻ cha <li> của header đó. Đối với chạy đơn, nằm trong block lớn.
                try:
                    stats_container = header.find_element(By.XPATH, "./ancestor::li")
                except:
                    stats_container = parent_entry

                # 2. Tên buổi chạy
                try:
                    activity_title = stats_container.find_element(By.XPATH, ".//a[@data-testid='activity_name']").text.strip()
                except:
                    activity_title = parent_entry.find_element(By.XPATH, ".//a[@data-testid='activity_name']").text.strip()

                # 3. Quãng đường
                distance = "0 km"
                try:
                    distance_element = stats_container.find_element(By.XPATH, ".//span[contains(text(), 'Quãng đường') or contains(text(), 'Distance')]/following-sibling::div")
                    distance = distance_element.text.strip()
                except:
                    pass

                # 4. Thời gian (Duration)
                duration = ""
                try:
                    duration_element = stats_container.find_element(By.XPATH, ".//span[contains(text(), 'Thời gian') or contains(text(), 'Time')]/following-sibling::div")
                    duration = duration_element.text.strip()
                except:
                    pass

                # 5. Pace (Nhịp độ)
                pace = ""
                try:
                    pace_element = stats_container.find_element(By.XPATH, ".//span[contains(text(), 'Nhịp độ') or contains(text(), 'Pace')]/following-sibling::div")
                    pace = pace_element.text.strip()
                except:
                    pass

                # Nếu không cào được Pace hoặc bài đăng của Văn Nam thiếu Pace, tự động tính toán
                if not pace or pace == "--:--" or pace == "":
                    pace = calculate_pace(distance, duration) + " (Tính)"

                print(f"{athlete_name:<20} | {distance:<12} | {pace:<15} | {duration:<15} | {activity_title}")
                total_runners += 1

            except Exception:
                continue

        print(f"\n[4/4] Đã hoàn thành! Tổng cộng cào được {total_runners} hoạt động trong ngày HÔM NAY.")

    except Exception as ex:
        print(f"Có lỗi hệ thống xảy ra: {ex}")
    finally:
        driver.quit()
        print("Đã đóng trình duyệt ảo giải phóng RAM.")

if __name__ == "__main__":
    crawl_strava_all_runners()
