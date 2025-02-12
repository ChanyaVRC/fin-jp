import { Hono } from "hono";
import { renderer } from "./renderer";

const app = new Hono();
app.use(renderer);


interface RGB {
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (hex: string): RGB => {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: parseInt(cleanHex.slice(0, 2), 16),
    g: parseInt(cleanHex.slice(2, 4), 16),
    b: parseInt(cleanHex.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: RGB): string =>
  "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");

const blendColors = (
  color1: string,
  color2: string,
  factor: number
): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return rgbToHex({
    r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor),
    g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor),
    b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor),
  });
};

const SEASONS = [
  "winter",
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "autumn",
  "autumn",
  "autumn",
  "winter",
];

const COLOR_MAP: Record<
  string,
  Record<
    string,
    {
      day: { start: string; end: string };
      night: { start: string; end: string };
    }
  >
> = {
  clear: {
    spring: {
      day: { start: "#76C7F0", end: "#A3E4FF" },
      night: { start: "#0A0F1A", end: "#080C16" },
    },
    summer: {
      day: { start: "#00D2FF", end: "#50E6FF" },
      night: { start: "#010F1E", end: "#010C18" },
    },
    autumn: {
      day: { start: "#FF8040", end: "#FFB266" },
      night: { start: "#2E0F14", end: "#2C0D12" },
    },
    winter: {
      day: { start: "#66CCFF", end: "#99E6FF" },
      night: { start: "#0F1623", end: "#0D1420" },
    },
  },
  cloudy: {
    spring: {
      day: { start: "#8EC0FF", end: "#B3D1FF" },
      night: { start: "#131F2E", end: "#121B27" },
    },
    summer: {
      day: { start: "#80BFFF", end: "#A3D1FF" },
      night: { start: "#101C2A", end: "#0F1925" },
    },
    autumn: {
      day: { start: "#FFB47D", end: "#FFCC99" },
      night: { start: "#23151C", end: "#201319" },
    },
    winter: {
      day: { start: "#90A3B8", end: "#A8BACC" },
      night: { start: "#0B0F1A", end: "#0A0D16" },
    },
  },
  other: {
    spring: {
      day: { start: "#A262FF", end: "#C48CFF" },
      night: { start: "#14112A", end: "#110F23" },
    },
    summer: {
      day: { start: "#FFA3E3", end: "#FFC1F3" },
      night: { start: "#321016", end: "#2B0D13" },
    },
    autumn: {
      day: { start: "#FF758F", end: "#FF9FA2" },
      night: { start: "#25111A", end: "#210E17" },
    },
    winter: {
      day: { start: "#75C8FF", end: "#A1DFFF" },
      night: { start: "#0C0A12", end: "#0B0810" },
    },
  },
};

function setBackgroundByTimeAndWeather(
  now: Date,
  condition: "clear" | "cloudy" | "other"
): { rainColor: string; gradient: string } {
  const season = SEASONS[now.getMonth()];
  const t = calculateDayNightFactor(now);
  const { day, night } = COLOR_MAP[condition][season];

  const startColor = blendColors(night.start, day.start, t);
  const endColor = blendColors(night.end, day.end, t);
  const midColor = blendColors(startColor, endColor, 0.5);
  const contrastColor = t < 0.5 ? "#FFF9C4" : "#263238";
  const rainColor = blendColors(midColor, contrastColor, 0.3);
  const gradient = `linear-gradient(to bottom, ${startColor}, ${endColor})`;

  return { rainColor, gradient };
}

function getWeatherCondition(
  weathercode: number
): "clear" | "cloudy" | "other" {
  if (weathercode === 0) {
    return "clear";
  } else if ([1, 2, 3].includes(weathercode)) {
    return "cloudy";
  } else {
    return "other";
  }
}
function calculateRainMetrics(now: Date): number {
  const timeInSeconds = now.getTime() / 1000;
  const slowTime = timeInSeconds / 1000;
  const t =
    (Math.sin(slowTime) +
     Math.cos(1.3 * slowTime) +
     Math.sin(2.1 * slowTime)) /
    3;
  const rainCount = Math.round(
    50 + 450 * ((t + Math.abs(t)) / 2) + 45 * ((t - Math.abs(t)) / 2)
  );
  return rainCount;
}

/**
 * Calculates the sky brightness factor (0 to 1) based on the given date.
 * Seasonal changes are taken into account by interpolating the sunrise and sunset times throughout the year.
 *
 * Model:
 *  - Sunrise is centered around 6.5 hours with a ±1.0 hour variation (e.g., ~5.5 in summer, ~7.5 in winter).
 *  - Sunset is centered around 18.0 hours with a ±1.5 hour variation (e.g., ~19.5 in summer, ~16.5 in winter).
 *  - The brightness follows a sine curve: 0 at sunrise, 1 at noon, and 0 at sunset.
 *
 * @param date - The Date object for which to calculate the brightness.
 * @returns The brightness factor (0 for dark, 1 for brightest).
 */
function calculateDayNightFactor(date: Date): number {
  // Calculate the number of days since the start of the year (January 1 as day 0)
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Convert current time to a decimal representation (e.g., 13:30 -> 13.5)
  const currentTime =
    date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  // Calculate the reference angle based on the day of the year (using June 21, the 172nd day, as the basis)
  const radians = 2 * Math.PI * ((dayOfYear - 172) / 365);

  // Interpolate the sunrise and sunset times dynamically over the year
  const sunrise = 6.5 - 1.0 * Math.cos(radians); // Approx. 5.5 in summer, 7.5 in winter
  const sunset = 18.0 + 1.5 * Math.cos(radians); // Approx. 19.5 in summer, 16.5 in winter

  // If before sunrise or after sunset, return brightness 0
  if (currentTime < sunrise || currentTime > sunset) {
    return 0;
  }

  // Calculate the progression of the day (from 0 at sunrise to 1 at sunset)
  const dayProgress = (currentTime - sunrise) / (sunset - sunrise);
  // Use a sine curve for smooth brightness transition (0 at sunrise, peak at noon, 0 at sunset)
  return Math.sin(dayProgress * Math.PI);
}

interface WeatherResponse {
  current_weather: {
    weathercode: number;
  };
}

app.get("/", async (c) => {
  let gradient = "linear-gradient(to bottom, #000428, #004e92)";
  let rainColor = "#90caf9";
  let weathercode: number = 0;

  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true"
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = (await response.json()) as WeatherResponse;
    weathercode = data.current_weather.weathercode;
  } catch (error) {
    console.error("天気情報の取得エラー:", error);
  }

  let condition = getWeatherCondition(weathercode);
  const timezone = "Asia/Tokyo";
  const now = new Date(
    new Date().toLocaleString("ja-JP", { timeZone: timezone })
  );
  ({ gradient, rainColor } = setBackgroundByTimeAndWeather(now, condition));

  const rainCount = calculateRainMetrics(now);
  return c.render(
    <div
      id="weather-bg"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100vh",
        background: gradient,
        transition: "background 1s linear",
      }}
    >
      <style>{`
        @keyframes fall {
          0% { top: -10%; opacity: 0; }
          20% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        .drop {
          position: absolute;
          width: 3px;
          height: 20px;
          background: ${rainColor};
        }
      `}</style>
      {Array.from({ length: rainCount }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 2 + Math.random() * 3;
        return (
          <div
            key={i}
            className="drop"
            style={{
              left: `${left}%`,
              top: "-10%",
              animation: `fall ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
});

export default app;
