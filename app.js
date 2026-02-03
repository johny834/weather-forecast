// Weather codes to emoji mapping
const weatherIcons = {
    0: '☀️',   // Clear sky
    1: '🌤️',  // Mainly clear
    2: '⛅',   // Partly cloudy
    3: '☁️',   // Overcast
    45: '🌫️', // Foggy
    48: '🌫️', // Depositing rime fog
    51: '🌧️', // Light drizzle
    53: '🌧️', // Moderate drizzle
    55: '🌧️', // Dense drizzle
    61: '🌧️', // Slight rain
    63: '🌧️', // Moderate rain
    65: '🌧️', // Heavy rain
    71: '🌨️', // Slight snow
    73: '🌨️', // Moderate snow
    75: '❄️',  // Heavy snow
    77: '🌨️', // Snow grains
    80: '🌦️', // Slight rain showers
    81: '🌦️', // Moderate rain showers
    82: '⛈️',  // Violent rain showers
    85: '🌨️', // Slight snow showers
    86: '🌨️', // Heavy snow showers
    95: '⛈️',  // Thunderstorm
    96: '⛈️',  // Thunderstorm with hail
    99: '⛈️',  // Thunderstorm with heavy hail
};

const weatherConditions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    85: 'Light snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm',
    99: 'Severe thunderstorm',
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Theme management
function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

// Get user location
async function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => resolve(position.coords),
            error => reject(error),
            { timeout: 10000, enableHighAccuracy: false }
        );
    });
}

// Fetch weather data from Open-Meteo (including snow data)
async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,snowfall,snow_depth&daily=weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum&timezone=auto&forecast_days=4`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data unavailable');
    return response.json();
}

// Reverse geocoding for location name
async function getLocationName(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'WeatherForecastApp/1.0' }
        });
        const data = await response.json();
        return data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Your location';
    } catch {
        return 'Your location';
    }
}

// Render current weather
function renderCurrent(data) {
    const current = data.current;
    const icon = weatherIcons[current.weather_code] || '🌡️';
    const condition = weatherConditions[current.weather_code] || 'Unknown';
    
    document.getElementById('current').innerHTML = `
        <div class="weather-icon">${icon}</div>
        <div class="temperature">${Math.round(current.temperature_2m)}°</div>
        <div class="condition">${condition}</div>
        <div class="weather-details">
            <span>💧 ${current.relative_humidity_2m}%</span>
            <span>💨 ${Math.round(current.wind_speed_10m)} km/h</span>
        </div>
    `;
}

// Render snow conditions
function renderSnow(data) {
    const current = data.current;
    const daily = data.daily;
    const snowContainer = document.getElementById('snow');
    
    const currentSnowfall = current.snowfall || 0; // cm/hour
    const snowDepth = current.snow_depth || 0; // meters
    const snowDepthCm = (snowDepth * 100).toFixed(0); // convert to cm
    
    // Check if there will be snow in the forecast
    const futureSnow = [];
    for (let i = 1; i <= 3; i++) {
        const snowfall = daily.snowfall_sum[i] || 0;
        if (snowfall > 0) {
            const date = new Date(daily.time[i]);
            futureSnow.push({
                day: shortDayNames[date.getDay()],
                amount: snowfall.toFixed(1)
            });
        }
    }
    
    // Determine if snowing now
    const isSnowing = currentSnowfall > 0;
    const snowIntensity = currentSnowfall > 2 ? 'Heavy' : currentSnowfall > 0.5 ? 'Moderate' : currentSnowfall > 0 ? 'Light' : 'No';
    
    // Only show snow section if there's relevant snow info
    const hasSnowInfo = isSnowing || snowDepth > 0 || futureSnow.length > 0;
    
    if (!hasSnowInfo) {
        snowContainer.style.display = 'none';
        return;
    }
    
    snowContainer.style.display = 'block';
    
    let snowHTML = `
        <div class="snow-header">
            <span class="snow-icon">❄️</span>
            <h2>Snow Conditions</h2>
        </div>
        <div class="snow-grid">
            <div class="snow-item">
                <span class="snow-label">Currently Snowing</span>
                <span class="snow-value">${isSnowing ? 'Yes' : 'No'}</span>
            </div>
            <div class="snow-item">
                <span class="snow-label">Intensity</span>
                <span class="snow-value">${snowIntensity}${isSnowing ? ` (${currentSnowfall.toFixed(1)} cm/h)` : ''}</span>
            </div>
            <div class="snow-item">
                <span class="snow-label">Snow Depth</span>
                <span class="snow-value">${snowDepthCm > 0 ? snowDepthCm + ' cm' : 'None'}</span>
            </div>
            <div class="snow-item">
                <span class="snow-label">Snow Expected</span>
                <span class="snow-value">${futureSnow.length > 0 ? 'Yes' : 'No'}</span>
            </div>
        </div>
    `;
    
    // Add forecast snow days if any
    if (futureSnow.length > 0) {
        snowHTML += `
            <div class="snow-forecast">
                <div class="snow-forecast-title">Upcoming Snowfall</div>
                <div class="snow-forecast-days">
                    ${futureSnow.map(s => `
                        <div class="snow-day">
                            <span>${s.day}:</span>
                            <span class="snow-day-amount">${s.amount} cm</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    snowContainer.innerHTML = snowHTML;
}

// Render 3-day forecast
function renderForecast(data) {
    const daily = data.daily;
    const forecastHTML = [];
    
    // Skip today (index 0), show next 3 days
    for (let i = 1; i <= 3; i++) {
        const date = new Date(daily.time[i]);
        const dayName = dayNames[date.getDay()];
        const dateStr = `${monthNames[date.getMonth()]} ${date.getDate()}`;
        const icon = weatherIcons[daily.weather_code[i]] || '🌡️';
        const high = Math.round(daily.temperature_2m_max[i]);
        const low = Math.round(daily.temperature_2m_min[i]);
        
        forecastHTML.push(`
            <div class="forecast-card">
                <div class="forecast-day">
                    <span class="day-name">${dayName}</span>
                    <span class="day-date">${dateStr}</span>
                </div>
                <div class="forecast-icon">${icon}</div>
                <div class="forecast-temps">
                    <span class="temp-high">${high}°</span>
                    <span class="temp-low">${low}°</span>
                </div>
            </div>
        `);
    }
    
    document.getElementById('forecast').innerHTML = forecastHTML.join('');
}

// Show error
function showError(message) {
    document.getElementById('current').innerHTML = `
        <div class="error">
            <p>${message}</p>
            <button onclick="init()">Try Again</button>
        </div>
    `;
    document.getElementById('snow').style.display = 'none';
}

// Initialize app
async function init() {
    try {
        document.getElementById('current').innerHTML = '<div class="loader"></div>';
        document.getElementById('forecast').innerHTML = '';
        document.getElementById('snow').style.display = 'none';
        document.getElementById('location').textContent = 'Detecting location...';
        
        const coords = await getLocation();
        const [weather, locationName] = await Promise.all([
            fetchWeather(coords.latitude, coords.longitude),
            getLocationName(coords.latitude, coords.longitude)
        ]);
        
        document.getElementById('location').textContent = locationName;
        renderCurrent(weather);
        renderSnow(weather);
        renderForecast(weather);
    } catch (error) {
        console.error(error);
        if (error.code === 1) {
            showError('Location access denied. Please enable location permissions.');
        } else {
            showError('Unable to load weather data. Please try again.');
        }
    }
}

// Setup theme toggle
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Start
initTheme();
init();
