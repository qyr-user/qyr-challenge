import time
import re
import json
import os
import urllib.request
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

# Đọc .env nếu có (dùng khi chạy local)
_env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_file):
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))

API_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")
API_SECRET   = os.environ.get("SCRAPE_IMPORT_SECRET", "")


def calculate_pace(distance_str, duration_str):
    try:
        dist_match = re.search(r"([0-9.,]+)", distance_str)
        if not dist_match:
            return None
        distance = float(dist_match.group(1).replace(",", "."))
        if distance == 0:
            return None

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
                total_seconds = int(nums[0]) * 60 + int(nums[1])
            elif len(nums) == 1:
                total_seconds = int(nums[0]) * 60

        if total_seconds == 0 or distance == 0:
            return None

        return round(total_seconds / distance)
    except Exception:
        return None


def parse_distance_km(distance_str):
    try:
        match = re.search(r"([0-9.,]+)", distance_str)
        if not match:
            return 0.0
        return float(match.group(1).replace(",", "."))
    except Exception:
        return 0.0


def parse_duration_seconds(duration_str):
    if not duration_str:
        return 0
    total = 0
    hr = re.search(r"(\d+)\s*(?:giờ|h(?!r))", duration_str, re.IGNORECASE)
    mn = re.search(r"(\d+)\s*(?:phút|min|m(?!\s*[0-9]))", duration_str, re.IGNORECASE)
    sc = re.search(r"(\d+)\s*(?:giây|sec|s(?!\w))", duration_str, re.IGNORECASE)
    if hr: total += int(hr.group(1)) * 3600
    if mn: total += int(mn.group(1)) * 60
    if sc: total += int(sc.group(1))
    if total == 0:
        parts = re.match(r"^(\d+):(\d{2})$", duration_str.strip())
        if parts:
            total = int(parts.group(1)) * 60 + int(parts.group(2))
    return total


def fetch_config():
    """Lấy session cookie + danh sách challenge đang diễn ra từ DB qua API."""
    if not API_BASE_URL or not API_SECRET:
        print("✗ Thiếu APP_BASE_URL hoặc SCRAPE_IMPORT_SECRET trong environment")
        return None, []

    url = f"{API_BASE_URL}/api/scrape-config"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {API_SECRET}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            session = data.get("stravaSession")
            valid = data.get("sessionValid", True)
            challenges = data.get("challenges", [])

            if not session:
                print("✗ Chưa cấu hình Strava session trong Admin → Settings")
                return None, []
            if not valid:
                print("⚠ Strava session đã hết hạn, hãy cập nhật trong Admin → Settings")
                return None, []

            print(f"✓ Session cookie OK (length: {len(session)})")
            print(f"✓ Challenges đang diễn ra: {len(challenges)}")
            for c in challenges:
                print(f"  - [{c['id']}] {c['name']} | Club: {c.get('stravaClubId', 'N/A')}")
            return session, challenges
    except Exception as ex:
        print(f"✗ Không lấy được config từ API: {ex}")
        return None, []


def crawl_club(driver, club_id, challenge_name):
    """Cào hoạt động hôm nay từ một Strava Club."""
    club_url = f"https://strava.com/clubs/{club_id}/recent_activity"
    print(f"\n  → Đang cào club {club_id} ({challenge_name})...")
    driver.get(club_url)

    WebDriverWait(driver, 30).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    time.sleep(4)

    # Cuộn để load thêm entries
    for _ in range(3):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    runner_headers = driver.find_elements(By.XPATH, "//div[@data-testid='entry-header']")
    print(f"  Tìm thấy {len(runner_headers)} entry-header, lọc hôm nay...")

    activities = []
    for header in runner_headers:
        try:
            parent_entry = header.find_element(By.XPATH,
                "./ancestor::div[@data-testid='web-feed-entry' or contains(@id, 'feed-entry-')]")

            try:
                time_el = parent_entry.find_element(By.XPATH, ".//time[@data-testid='date_at_time']")
                time_text = time_el.text.strip().lower()
            except Exception:
                continue

            if "hôm nay" not in time_text and "today" not in time_text:
                continue

            athlete_name = header.find_element(By.XPATH, ".//a[@data-testid='owners-name']").text.strip()
            if not athlete_name or athlete_name.lower() == "hồ sơ":
                continue

            try:
                stats_container = header.find_element(By.XPATH, "./ancestor::li")
            except Exception:
                stats_container = parent_entry

            try:
                activity_title = stats_container.find_element(By.XPATH,
                    ".//a[@data-testid='activity_name']").text.strip()
            except Exception:
                try:
                    activity_title = parent_entry.find_element(By.XPATH,
                        ".//a[@data-testid='activity_name']").text.strip()
                except Exception:
                    activity_title = "Running"

            distance_str = "0 km"
            try:
                dist_el = stats_container.find_element(By.XPATH,
                    ".//span[contains(text(),'Quãng đường') or contains(text(),'Distance')]/following-sibling::div")
                distance_str = dist_el.text.strip()
            except Exception:
                pass

            duration_str = ""
            try:
                dur_el = stats_container.find_element(By.XPATH,
                    ".//span[contains(text(),'Thời gian') or contains(text(),'Time')]/following-sibling::div")
                duration_str = dur_el.text.strip()
            except Exception:
                pass

            distance_km = parse_distance_km(distance_str)
            moving_time = parse_duration_seconds(duration_str)
            pace_seconds = calculate_pace(distance_str, duration_str)

            print(f"  ✓ {athlete_name} | {distance_str} | {duration_str} | {activity_title}")

            activities.append({
                "athleteName": athlete_name,
                "activityName": activity_title,
                "distanceKm": distance_km,
                "movingTime": moving_time,
                "paceSeconds": pace_seconds,
            })

        except Exception:
            continue

    return activities


def send_to_api(challenge_id, activities):
    if not activities:
        print(f"  Không có hoạt động nào để gửi cho challenge {challenge_id}.")
        return

    print(f"  Đang gửi {len(activities)} hoạt động lên API...")

    payload = json.dumps({
        "challengeId": challenge_id,
        "activities": activities,
    }).encode("utf-8")

    url = f"{API_BASE_URL}/api/scrape-import"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_SECRET}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            body = json.loads(res.read().decode("utf-8"))
            print(f"  ✓ Đã lưu: {body.get('saved')} hoạt động mới")
            if body.get("skipped"):
                print(f"  Bỏ qua (trùng): {body.get('skipped')}")
            if body.get("noMatch"):
                print(f"  ⚠ Không khớp tên VĐV: {body.get('noMatch')}")
    except Exception as ex:
        print(f"  ✗ Lỗi gửi API: {ex}")


if __name__ == "__main__":
    print("=== Strava Scraper ===")

    strava_session, challenges = fetch_config()
    if not strava_session or not challenges:
        print("Không có gì để cào. Dừng.")
        exit(0)

    # Lọc challenges có stravaClubId
    valid_challenges = [c for c in challenges if c.get("stravaClubId")]
    if not valid_challenges:
        print("✗ Không có challenge nào được cấu hình Strava Club ID.")
        exit(0)

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1280,1000")
    chrome_options.add_argument("--disable-gpu")

    print("\nKhởi tạo trình duyệt Chrome (headless)...")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options
    )

    try:
        # Set session cookie
        driver.get("https://strava.com")
        time.sleep(1)
        driver.add_cookie({
            "name": "_strava4_session",
            "value": strava_session,
            "domain": ".strava.com",
            "path": "/"
        })
        print("✓ Session cookie đã được set")

        for challenge in valid_challenges:
            activities = crawl_club(driver, challenge["stravaClubId"], challenge["name"])
            print(f"  Tổng: {len(activities)} hoạt động hôm nay")
            send_to_api(challenge["id"], activities)

    except Exception as ex:
        print(f"Lỗi hệ thống: {ex}")
    finally:
        driver.quit()
        print("\nĐã đóng trình duyệt.")

    print("\n=== Hoàn tất ===")
