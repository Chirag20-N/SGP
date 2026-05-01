const API_URL = 'http://localhost:3000/api';
let map;
let charts = {};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSidebarData();
    fetchWeatherData('London'); // Default City
});

// UI Event Listeners
document.getElementById('search-btn').addEventListener('click', handleSearch);
document.getElementById('city-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('save-city-btn').addEventListener('click', saveCurrentCity);

// New Listeners for the features in the image
document.getElementById('travel-check-btn').addEventListener('click', handleTravelPlanner);
document.getElementById('compare-btn').addEventListener('click', handleComparison);

async function handleSearch() {
    const city = document.getElementById('city-input').value.trim();
    if (city) {
        await fetchWeatherData(city);
        logRecentSearch(city);
        document.getElementById('city-input').value = '';
    }
}

// Fetch Master Function
async function fetchWeatherData(city) {
    showLoading(true);
    try {
        const [weatherRes, newsRes] = await Promise.all([
            fetch(`${API_URL}/weather/${city}`).then(res => res.json()),
            fetch(`${API_URL}/news/${city}`).then(res => res.json())
        ]);

        if (weatherRes.error) throw new Error(weatherRes.error);

        updateWeatherUI(weatherRes.current);
        updateForecastUI(weatherRes.forecast.list);
        updateAQI(weatherRes.aqi.list[0].components, weatherRes.aqi.list[0].main.aqi);
        updateMap(weatherRes.current.coord.lat, weatherRes.current.coord.lon);
        updateChartsData(weatherRes.forecast.list, weatherRes.aqi.list[0].main.aqi);
        generateSuggestions(weatherRes.current, weatherRes.aqi.list[0].main.aqi);
        updateNews(newsRes);
        updateBackground(weatherRes.current.weather[0].main, weatherRes.current.sys);
        
        // NEW FEATURE UPDATERS
        updateSolarUI(weatherRes.current);
        updateWindCompass(weatherRes.current.wind.deg);
        
        document.getElementById('save-city-btn').dataset.city = weatherRes.current.name;
    } catch (err) {
        console.error(err);
        alert('City not found or API error.');
    } finally {
        showLoading(false);
    }
}

// UI Updaters
function updateWeatherUI(data) {
    document.getElementById('city-name').innerText = `${data.name}, ${data.sys.country}`;
    document.getElementById('temperature').innerText = `${Math.round(data.main.temp)}°C`;
    document.getElementById('condition').innerText = data.weather[0].description.toUpperCase();
    document.getElementById('feels-like').innerText = `${Math.round(data.main.feels_like)}°C`;
    document.getElementById('humidity').innerText = `${data.main.humidity}%`;
    document.getElementById('wind').innerText = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
    document.getElementById('visibility').innerText = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
}

// NEW: Solar & Local Time Logic
function updateSolarUI(data) {
    // Calculate local time based on timezone offset
    const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (data.timezone * 1000));
    
    document.getElementById('local-time').innerText = localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Format Sunrise/Sunset (correcting for timezone)
    const format = (unix) => {
        const date = new Date((unix + data.timezone) * 1000);
        return date.toUTCString().slice(-12, -7); 
    };

    document.getElementById('sunrise-time').innerText = format(data.sys.sunrise);
    document.getElementById('sunset-time').innerText = format(data.sys.sunset);

    const daylightHours = ((data.sys.sunset - data.sys.sunrise) / 3600).toFixed(1);
    document.getElementById('daylight-val').innerText = `${daylightHours} hrs`;
}

// NEW: Wind Compass Logic
function updateWindCompass(deg) {
    const arrow = document.getElementById('compass-arrow');
    if (arrow) {
        arrow.style.transform = `rotate(${deg}deg)`;
    }
    const loadingText = document.getElementById('wind-loading-text');
    if (loadingText) loadingText.innerText = `${deg}° Direction`;
}

// NEW: Travel Planner Logic
async function handleTravelPlanner() {
    const city = document.getElementById('travel-city').value;
    const date = document.getElementById('travel-date').value;
    if (!city || !date) return alert("Please enter city and date");
    
    // In a real app, you'd fetch specific date data. Here we trigger the search.
    await fetchWeatherData(city);
    alert(`Showing forecast for ${city}. Note: Free APIs usually provide 5-day forecasts only.`);
}

// NEW: Compare Logic
async function handleComparison() {
    const c1 = document.getElementById('compare-city-1').value;
    const c2 = document.getElementById('compare-city-2').value;
    
    if (!c1 || !c2) return alert("Enter two cities to compare");

    try {
        const [res1, res2] = await Promise.all([
            fetch(`${API_URL}/weather/${c1}`).then(r => r.json()),
            fetch(`${API_URL}/weather/${c2}`).then(r => r.json())
        ]);
        
        alert(`Comparison:\n${res1.name}: ${res1.main.temp}°C, ${res1.weather[0].main}\n${res2.name}: ${res2.main.temp}°C, ${res2.weather[0].main}`);
    } catch (e) {
        alert("Error comparing cities.");
    }
}

function updateForecastUI(list) {
    const hourly = document.getElementById('hourly-container');
    const daily = document.getElementById('daily-container');
    hourly.innerHTML = ''; daily.innerHTML = '';

    list.slice(0, 8).forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        hourly.innerHTML += `
            <div class="forecast-item fade-in">
                <p>${time}</p>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
                <p><b>${Math.round(item.main.temp)}°</b></p>
                <p class="text-sm"><i class="fa-solid fa-droplet"></i> ${Math.round(item.pop * 100)}%</p>
            </div>`;
    });

    const dailyData = list.filter(item => item.dt_txt.includes('12:00:00'));
    dailyData.forEach(item => {
        const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
        daily.innerHTML += `
            <div class="forecast-item fade-in">
                <p>${day}</p>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
                <p><b>${Math.round(item.main.temp_max)}°</b></p>
                <p class="text-sm">${Math.round(item.main.temp_min)}°</p>
            </div>`;
    });
}

function updateAQI(components, aqiVal) {
    document.getElementById('pm25').innerText = components.pm2_5;
    document.getElementById('pm10').innerText = components.pm10;
    const labels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
    const colors = ["#4caf50", "#ffeb3b", "#ff9800", "#f44336", "#9c27b0"];
    const labelEl = document.getElementById('aqi-label');
    if (labelEl) {
        labelEl.innerText = labels[aqiVal - 1] || "Unknown";
        labelEl.style.color = colors[aqiVal - 1] || "white";
    }
}

function updateChartsData(list, aqi) {
    const timeLabels = list.slice(0, 8).map(i => new Date(i.dt * 1000).toLocaleTimeString([], { hour: '2-digit' }));
    const temps = list.slice(0, 8).map(i => i.main.temp);
    const rain = list.slice(0, 8).map(i => i.pop * 100);
    const wind = list.slice(0, 8).map(i => i.wind.speed * 3.6);

    createChart('tempChart', 'line', timeLabels, temps, 'Temperature (°C)', 'rgba(255, 99, 132, 1)');
    createChart('rainChart', 'bar', timeLabels, rain, 'Rain Prob (%)', 'rgba(54, 162, 235, 1)');
    createChart('windChart', 'line', timeLabels, wind, 'Wind Speed (km/h)', 'rgba(153, 102, 255, 1)');
    createChart('aqiChart', 'doughnut', ["AQI Level", "Remaining"], [aqi, 5 - aqi], 'Air Quality', ['#ffeb3b', '#e0e0e0']);
}

function createChart(canvasId, type, labels, data, label, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: Array.isArray(color) ? color : color.replace('1)', '0.5)'),
                borderColor: type !== 'doughnut' ? color : undefined,
                borderWidth: 2,
                fill: type === 'line'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: isDark ? '#fff' : '#000' } } },
            scales: type !== 'doughnut' ? {
                x: { grid: { color: gridColor }, ticks: { color: isDark ? '#fff' : '#000' } },
                y: { grid: { color: gridColor }, ticks: { color: isDark ? '#fff' : '#000' } }
            } : {}
        }
    });
}

function updateMap(lat, lon) {
    if (!map) {
        map = L.map('map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    } else {
        map.setView([lat, lon], 10);
    }
    L.marker([lat, lon]).addTo(map);
}

function generateSuggestions(current, aqi) {
    const ul = document.getElementById('suggestions-list');
    if (!ul) return;
    ul.innerHTML = '';
    let suggestions = [];
    const condition = current.weather[0].main;
    const temp = current.main.temp;

    if (condition === 'Clear') suggestions.push('😎 Wear sunglasses', '🧴 Apply sunscreen');
    if (condition === 'Rain') suggestions.push('☂ Carry an umbrella', '☕ Indoor activities');
    if (temp > 35) suggestions.push('💧 Drink plenty of water');
    if (aqi >= 4) suggestions.push('⚠ Avoid outdoor exercise', '😷 Wear a mask');

    [...new Set(suggestions)].slice(0, 5).forEach(s => {
        ul.innerHTML += `<li class="fade-in"><i class="fa-solid fa-check text-sm"></i> ${s}</li>`;
    });
}

function updateNews(articles) {
    const container = document.getElementById('news-container');
    if (!container) return;
    container.innerHTML = '';
    if (!articles || articles.length === 0) {
        container.innerHTML = '<p>No recent news found.</p>';
        return;
    }
    articles.slice(0, 3).forEach(article => {
        if(!article.urlToImage) return;
        container.innerHTML += `
            <a href="${article.url}" target="_blank" class="news-item fade-in">
                <img src="${article.urlToImage}" alt="News">
                <div>
                    <h4>${article.title}</h4>
                    <p class="text-sm">${article.source.name}</p>
                </div>
            </a>`;
    });
}

async function loadSidebarData() {
    try {
        const saved = await fetch(`${API_URL}/cities/saved`).then(r => r.json());
        const recent = await fetch(`${API_URL}/cities/recent`).then(r => r.json());
        
        const savedUl = document.getElementById('saved-cities-list');
        savedUl.innerHTML = '';
        saved.forEach(c => {
            savedUl.innerHTML += `<li onclick="fetchWeatherData('${c.name}')">${c.name} <i class="fa-solid fa-trash" onclick="event.stopPropagation(); deleteCity('${c.name}')" style="float:right; color:red;"></i></li>`;
        });

        const recentUl = document.getElementById('recent-searches-list');
        recentUl.innerHTML = '';
        recent.forEach(c => {
            recentUl.innerHTML += `<li onclick="fetchWeatherData('${c.name}')"><i class="fa-solid fa-clock-rotate-left"></i> ${c.name}</li>`;
        });
    } catch(e) {}
}

async function saveCurrentCity() {
    const city = document.getElementById('save-city-btn').dataset.city;
    if (!city) return;
    await fetch(`${API_URL}/cities/saved`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: city })
    });
    loadSidebarData();
}

async function deleteCity(name) {
    await fetch(`${API_URL}/cities/saved/${name}`, { method: 'DELETE' });
    loadSidebarData();
}

async function logRecentSearch(city) {
    await fetch(`${API_URL}/cities/recent`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: city })
    });
    loadSidebarData();
}

function updateBackground(condition, sys) {
    const body = document.body;
    body.className = 'transition-bg'; 
    const isNight = Date.now() / 1000 > sys.sunset || Date.now() / 1000 < sys.sunrise;
    
    if (isNight) body.classList.add('bg-night');
    else if (condition === 'Clear') body.classList.add('bg-sunny');
    else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(condition)) body.classList.add('bg-rainy');
    else if (['Clouds', 'Mist', 'Fog'].includes(condition)) body.classList.add('bg-cloudy');
    else body.classList.add('bg-default');
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const city = document.getElementById('city-name').innerText.split(',')[0];
    if(city && city !== "City") fetchWeatherData(city);
}

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        if (show) spinner.classList.remove('hidden');
        else spinner.classList.add('hidden');
    }
}