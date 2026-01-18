Esto se ejecuta en la consola de Backend con el token que se obtiene desde Frontend para actualizar la imagen/juego de los eventos que tenían la imagen rota.

fetch('https://clubdn-api-production.up.railway.app/api/events/admin/sync-bgg-ids', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWpnZDFxYW0wMDBsaG90b282ZnVrbDRvIiwiZW1haWwiOiJjaGVtaS5hZG1pbkBlamVtcGxvLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc2ODQxMDgwMywiZXhwIjoxNzY5MDE1NjAzfQ.u1KpcgshByYOyvvhUBGoXzV7l_dv81LB6DGkTuuaGT8',
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log)