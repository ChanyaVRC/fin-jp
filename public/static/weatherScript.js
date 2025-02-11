function calculateDayNightFactor(hour) {    
    if (hour < 6) {
        // 午前0時〜6時: 完全な夜
        return 0;
    } else if (hour < 12) {
        // 午前6時〜正午: 徐々に昼へ移行
        return (hour - 6) / 6;
    } else if (hour < 18) {
        // 正午〜午後6時: 完全な昼
        return 1;
    } else if (hour < 22) {
        // 午後6時〜午後10時: 徐々に夜へ移行
        return 1 - (hour - 18) / 4;
    } else {
        // 午後10時〜深夜: 完全な夜
        return 0;
    }
}

const hexToRgb = hex => {
    // ヘックスカラーをRGBオブジェクトに変換する関数
    hex = hex.replace("#", "");
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
};

// RGBオブジェクトをヘックスカラーに変換する関数
const rgbToHex = ({ r, g, b }) =>
    "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("");

// 2色の線形補間を行う関数 (factor: 0～1)
const blendColors = (color1, color2, factor) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    return rgbToHex({
        r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor),
        g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor),
        b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor)
    });
};

function setBackgroundByTimeAndWeather(now, hour, weathercode) {
    // 現在の月から季節を判定する（0: January～11: December）
    const season = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"][now.getMonth()];

    // 指定された時刻(hour)に基づいて昼夜の補間係数を取得
    const t = calculateDayNightFactor(hour);

    // 天気コードと季節に応じた色設定のマッピング
    const colorMap = {
        clear: {
            spring: { day: { start: "#76C7F0", end: "#A3E4FF" }, night: { start: "#0A0F1A", end: "#080C16" } },
            summer: { day: { start: "#00D2FF", end: "#50E6FF" }, night: { start: "#010F1E", end: "#010C18" } },
            autumn: { day: { start: "#FF8040", end: "#FFB266" }, night: { start: "#2E0F14", end: "#2C0D12" } },
            winter: { day: { start: "#66CCFF", end: "#99E6FF" }, night: { start: "#0F1623", end: "#0D1420" } }
        },
        cloudy: {
            spring: { day: { start: "#8EC0FF", end: "#B3D1FF" }, night: { start: "#131F2E", end: "#121B27" } },
            summer: { day: { start: "#80BFFF", end: "#A3D1FF" }, night: { start: "#101C2A", end: "#0F1925" } },
            autumn: { day: { start: "#FFB47D", end: "#FFCC99" }, night: { start: "#23151C", end: "#201319" } },
            winter: { day: { start: "#90A3B8", end: "#A8BACC" }, night: { start: "#0B0F1A", end: "#0A0D16" } }
        },
        other: {
            spring: { day: { start: "#A262FF", end: "#C48CFF" }, night: { start: "#14112A", end: "#110F23" } },
            summer: { day: { start: "#FFA3E3", end: "#FFC1F3" }, night: { start: "#321016", end: "#2B0D13" } },
            autumn: { day: { start: "#FF758F", end: "#FF9FA2" }, night: { start: "#25111A", end: "#210E17" } },
            winter: { day: { start: "#75C8FF", end: "#A1DFFF" }, night: { start: "#0C0A12", end: "#0B0810" } }
        }
    };

    // 天気コードに基づいて状態を判定
    const condition = weathercode === 0 ? "clear" : [1, 2, 3].includes(weathercode) ? "cloudy" : "other";
    const { day, night } = colorMap[condition][season];

    // 背景グラデーションの開始色と終了色を計算
    const startColor = blendColors(night.start, day.start, t);
    const endColor = blendColors(night.end, day.end, t);

    // グラデーションの中間色を求める
    const midColor = blendColors(startColor, endColor, 0.5);

    // 昼夜に応じたコントラストカラーを設定
    const contrastColor = t < 0.5 ? "#ffffff" : "#000000";

    // 雨粒の色は中間色とコントラストカラーをブレンドして調整
    const rainColor = blendColors(midColor, contrastColor, 0.3);
    document.querySelectorAll('.drop').forEach(drop => {
        drop.style.background = rainColor;
    });

    // 補間したグラデーションを適用
    const gradient = `linear-gradient(to bottom, ${blendColors(night.start, day.start, t)}, ${blendColors(night.end, day.end, t)})`;
    document.getElementById("weather-bg").style.background = gradient;
}

(async function () {
    // 天気情報の取得。fetchとJSON変換のエラーはそれぞれ個別にハンドルする
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true")
        .catch(error => console.error("天気情報の取得エラー:", error));
    if (!response) return;

    const data = await response.json()
        .catch(error => console.error("天気情報の取得エラー:", error));
    if (!data) return;
    const { weathercode } = data.current_weather;

    const now = new Date();
    const hour = now.getHours();

    // 新規に作成した関数を用いて、時間帯と天気に基づいた背景変更を実施する
    setBackgroundByTimeAndWeather(new Date(), hour, weathercode);
})();
