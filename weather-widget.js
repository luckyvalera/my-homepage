class WeatherWidget {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.loadingEl = document.getElementById('weather-loading');
        this.contentEl = document.getElementById('weather-content');
        this.errorEl = document.getElementById('weather-error');
        
        // Default configuration
        this.config = {
            defaultLat: 47.6062, // Seattle coordinates
            defaultLon: -122.3321,
            units: 'celsius',
            updateInterval: 10 * 60 * 1000, // 10 minutes
            ...options
        };
        
        this.apiUrl = 'https://api.open-meteo.com/v1/forecast';
        this.lastUpdate = null;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            
            // Try to get user's location, fallback to default
            const coords = await this.getLocation();
            const weatherData = await this.fetchWeather(coords.lat, coords.lon);
            
            this.render(weatherData);
            this.showContent();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
        } catch (error) {
            console.error('Weather widget error:', error);
            this.showError();
        }
    }

    async getLocation() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        });
                    },
                    () => {
                        // Fallback to default location
                        resolve({
                            lat: this.config.defaultLat,
                            lon: this.config.defaultLon
                        });
                    },
                    { timeout: 5000 }
                );
            } else {
                resolve({
                    lat: this.config.defaultLat,
                    lon: this.config.defaultLon
                });
            }
        });
    }

    async fetchWeather(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current_weather: true,
            hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
            daily: 'sunrise,sunset',
            timezone: 'auto'
        });

        const response = await fetch(`${this.apiUrl}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        this.lastUpdate = new Date();
        
        return this.processWeatherData(data);
    }

    processWeatherData(data) {
        const current = data.current_weather;
        const hourly = data.hourly;
        const daily = data.daily;
        
        return {
            temperature: Math.round(current.temperature),
            windSpeed: Math.round(current.windspeed),
            windDirection: current.winddirection,
            weatherCode: current.weathercode,
            time: new Date(current.time),
            humidity: hourly.relative_humidity_2m[0],
            sunrise: new Date(daily.sunrise[0]),
            sunset: new Date(daily.sunset[0]),
            location: this.getLocationName(data.latitude, data.longitude)
        };
    }

    getLocationName(lat, lon) {
        // Simple location naming - you could enhance this with reverse geocoding
        if (Math.abs(lat - 47.6062) < 0.1 && Math.abs(lon - (-122.3321)) < 0.1) {
            return 'Seattle, WA';
        }
        return `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`;
    }

    getWeatherIcon(weatherCode) {
        // WMO Weather interpretation codes
        const iconMap = {
            0: '☀️', // Clear sky
            1: '🌤️', // Mainly clear
            2: '⛅', // Partly cloudy
            3: '☁️', // Overcast
            45: '🌫️', // Fog
            48: '🌫️', // Depositing rime fog
            51: '🌦️', // Light drizzle
            53: '🌦️', // Moderate drizzle
            55: '🌦️', // Dense drizzle
            61: '🌧️', // Slight rain
            63: '🌧️', // Moderate rain
            65: '🌧️', // Heavy rain
            71: '🌨️', // Slight snow
            73: '🌨️', // Moderate snow
            75: '🌨️', // Heavy snow
            95: '⛈️', // Thunderstorm
            96: '⛈️', // Thunderstorm with hail
            99: '⛈️'  // Thunderstorm with heavy hail
        };
        
        return iconMap[weatherCode] || '🌤️';
    }

    getWeatherDescription(weatherCode) {
        const descriptions = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy',
            51: 'Light drizzle',
            53: 'Drizzle',
            55: 'Heavy drizzle',
            61: 'Light rain',
            63: 'Rain',
            65: 'Heavy rain',
            71: 'Light snow',
            73: 'Snow',
            75: 'Heavy snow',
            95: 'Thunderstorm',
            96: 'Thunderstorm',
            99: 'Severe thunderstorm'
        };
        
        return descriptions[weatherCode] || 'Unknown';
    }

    render(weatherData) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        this.contentEl.innerHTML = `
            <div class="weather-header">
                <div>
                    <h3 class="weather-location">${weatherData.location}</h3>
                    <p class="weather-time">Updated ${timeString}</p>
                </div>
            </div>
            
            <div class="weather-main">
                <div class="weather-temp">${weatherData.temperature}°</div>
                <div class="weather-condition">
                    <div class="weather-icon">${this.getWeatherIcon(weatherData.weatherCode)}</div>
                    <p class="weather-description">${this.getWeatherDescription(weatherData.weatherCode)}</p>
                </div>
            </div>
            
            <div class="weather-details">
                <div class="weather-detail">
                    <div class="weather-detail-label">Humidity</div>
                    <div class="weather-detail-value">${weatherData.humidity}%</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Wind</div>
                    <div class="weather-detail-value">${weatherData.windSpeed} km/h</div>
                </div>
            </div>
        `;
    }

    showLoading() {
        this.loadingEl.style.display = 'block';
        this.contentEl.style.display = 'none';
        this.errorEl.style.display = 'none';
    }

    showContent() {
        this.loadingEl.style.display = 'none';
        this.contentEl.style.display = 'block';
        this.errorEl.style.display = 'none';
    }

    showError() {
        this.loadingEl.style.display = 'none';
        this.contentEl.style.display = 'none';
        this.errorEl.style.display = 'block';
    }

    setupAutoRefresh() {
        setInterval(() => {
            this.init();
        }, this.config.updateInterval);
    }
}

// Initialize the weather widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.weatherWidget = new WeatherWidget('weather-widget');
});
