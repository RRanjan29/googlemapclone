// Setup
let lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap contributors' });
let darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{ attribution:'© CartoDB' });
let map = L.map('map',{ center:[22.5726,88.3639], zoom:12, layers:[lightTiles] });
let currentMarker, routeLayer;
let darkMode = false;
let favorites = JSON.parse(localStorage.getItem('gm_favs')||'[]');

// Get current location
navigator.geolocation.getCurrentPosition(p => {
  const {latitude:lat, longitude:lon} = p.coords;
  map.setView([lat,lon],14);
  currentMarker = L.marker([lat,lon]).addTo(map).bindPopup("📍 You are here!").openPopup();
}, err=>console.warn(err));

// Search function
function searchLocation() {
  const q = document.getElementById('searchBox').value;
  if (!q) return alert("Enter search query!");
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
    .then(r=>r.json()).then(data=>{
      if (!data.length) return alert("Not found");
      const loc=data[0], {lat, lon, display_name:name}=loc;
      map.setView([lat,lon],14);
      if(currentMarker) map.removeLayer(currentMarker);
      currentMarker = L.marker([lat,lon]).addTo(map)
        .bindPopup(`<b>${name}</b><br><button onclick="addFavorite('${encodeURIComponent(name)}',${lat},${lon})">Add to Favorites</button>`)
        .openPopup();
      loadCategories(lat, lon);
    });
}

// Theme toggle
function toggleTheme(){
  if(darkMode){ map.removeLayer(darkTiles); lightTiles.addTo(map); }
  else { map.removeLayer(lightTiles); darkTiles.addTo(map); }
  darkMode=!darkMode;
}

// Favorites
function addFavorite(name,lat,lon){
  const fav={name:decodeURIComponent(name),lat,lon};
  favorites.push(fav);
  localStorage.setItem('gm_favs', JSON.stringify(favorites));
  alert("Saved to favorites!");
}

function showFavorites(){
  map.closePopup();
  if(routeLayer){ map.removeLayer(routeLayer); }
  favorites.forEach(f=>{
    L.marker([f.lat,f.lon]).addTo(map).bindPopup(`<b>${f.name}</b>`);
  });
}

// Route directions
function getRoute(){
  const a = document.getElementById('fromBox').value, b=document.getElementById('toBox').value;
  if(!a||!b) return alert("Enter both fields!");
  Promise.all([
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(a)}`).then(r=>r.json()),
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(b)}`).then(r=>r.json())
  ]).then(([A,B])=>{
    if(!A[0]||!B[0]) return alert("Location not found");
    const from=A[0], to=B[0];
    fetch(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full`)
      .then(r=>r.json()).then(data=>{
        const coords = data.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
        if(routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.polyline(coords,{color:'blue'}).addTo(map);
        map.fitBounds(routeLayer.getBounds());
      });
  });
}

// Category search (Restaurants, ATMs)
function loadCategories(lat,lon){
  const catSel=document.getElementById('categorySelect');
  if(catSel.options.length>1)return;
  const cats=['restaurant','atm','hospital'];
  cats.forEach(c=>{
    const opt = document.createElement('option');
    opt.value=c; opt.text=c.charAt(0).toUpperCase()+c.slice(1);
    catSel.appendChild(opt);
  });
}

function filterCategory(){
  const cat=document.getElementById('categorySelect').value;
  if(!i) return;
  const bbox = map.getBounds();
  const [sw,ne]=[bbox.getSouthWest(), bbox.getNorthEast()];
  fetch(`https://nominatim.openstreetmap.org/search?format=json&amenity=${cat}&bounded=1&viewbox=${sw.lng},${ne.lat},${ne.lng},${sw.lat}`)
    .then(r=>r.json()).then(data=>{
      data.forEach(d=>L.marker([+d.lat,+d.lon]).addTo(map).bindPopup(d.display_name));
    });
}
