// ============================================================
// Weather Service — OpenWeatherMap Integration
// Fetches forecasts with in-memory caching for efficiency
// ============================================================

interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  rainProbability: number;
  description: string;
}

interface CacheEntry {
  data: WeatherForecast[];
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const weatherCache = new Map<string, CacheEntry>();

/**
 * Fetches weather forecast for a city from OpenWeatherMap.
 * Implements in-memory caching with 30-minute TTL to minimize API calls.
 */
export async function getWeatherForecast(city: string, days: number = 5): Promise<WeatherForecast[]> {
  const cacheKey = `${city.toLowerCase()}_${days}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Weather] Cache hit for "${city}"`);
    return cached.data;
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('[Weather] No API key found — returning mock data');
    return generateMockForecast(city, days);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&cnt=${days * 8}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Weather] API error: ${response.status} ${response.statusText}`);
      return generateMockForecast(city, days);
    }

    const data = await response.json() as {
      list: Array<{
        dt: number;
        main: { temp_max: number; temp_min: number };
        weather: Array<{ main: string; icon: string; description: string }>;
        pop: number;
      }>;
    };

    // Group by date and aggregate daily highs/lows
    const dailyMap = new Map<string, WeatherForecast>();

    for (const entry of data.list) {
      const date = new Date(entry.dt * 1000).toISOString().split('T')[0]!;

      const existing = dailyMap.get(date);
      if (!existing) {
        dailyMap.set(date, {
          date,
          high: Math.round(entry.main.temp_max),
          low: Math.round(entry.main.temp_min),
          condition: entry.weather[0]?.main ?? 'Clear',
          icon: entry.weather[0]?.icon ?? '01d',
          rainProbability: Math.round((entry.pop ?? 0) * 100),
          description: entry.weather[0]?.description ?? 'clear sky',
        });
      } else {
        existing.high = Math.max(existing.high, Math.round(entry.main.temp_max));
        existing.low = Math.min(existing.low, Math.round(entry.main.temp_min));
        existing.rainProbability = Math.max(existing.rainProbability, Math.round((entry.pop ?? 0) * 100));
      }
    }

    const forecasts = Array.from(dailyMap.values()).slice(0, days);

    // Cache the result
    weatherCache.set(cacheKey, { data: forecasts, timestamp: Date.now() });
    console.log(`[Weather] Fetched ${forecasts.length} days for "${city}"`);

    return forecasts;
  } catch (error) {
    console.error('[Weather] Fetch failed:', error);
    return generateMockForecast(city, days);
  }
}

/** Generates realistic mock weather data when API is unavailable */
function generateMockForecast(city: string, days: number): WeatherForecast[] {
  const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm'];
  const descriptions = ['clear sky', 'scattered clouds', 'moderate rain', 'light drizzle', 'thunderstorm'];
  const icons = ['01d', '03d', '10d', '09d', '11d'];

  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const condIdx = Math.floor(Math.random() * conditions.length);

    return {
      date: date.toISOString().split('T')[0]!,
      high: 20 + Math.floor(Math.random() * 15),
      low: 10 + Math.floor(Math.random() * 10),
      condition: conditions[condIdx]!,
      icon: icons[condIdx]!,
      rainProbability: condIdx >= 2 ? 40 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 20),
      description: descriptions[condIdx]!,
    };
  });
}

/** Clears the weather cache (for testing) */
export function clearWeatherCache(): void {
  weatherCache.clear();
}
