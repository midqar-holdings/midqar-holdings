const SHEET_ID = '112SazpM1TBrKNBB65PsqugkZxcRAb0Vzh8YPzN7E8NU';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'login')          return handleLogin(e);
  if (action === 'getUsers')       return handleGetUsers(e);
  if (action === 'createUser')     return handleCreateUser(e);
  if (action === 'updateUser')     return handleUpdateUser(e);
  if (action === 'deleteUser')     return handleDeleteUser(e);
  if (action === 'saveChecklist')  return handleSaveChecklist(e);
  if (action === 'getChecklist')   return handleGetChecklist(e);
  if (action === 'saveAlert')      return handleSaveAlert(e);
  if (action === 'getAlerts')      return handleGetAlerts(e);
  if (action === 'resolveAlert')   return handleResolveAlert(e);
  return respond({ error: 'Invalid action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    e.parameter = Object.assign(e.parameter || {}, body);
  } catch(err) {}
  return doGet(e);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(name) || ss.getSheets()[0];
}

function getHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = {};
  headers.forEach((h, i) => col[h.toString().trim()] = i);
  return col;
}

function handleLogin(e) {
  try {
    const email = (e.parameter.email || '').toLowerCase().trim();
    const pin   = (e.parameter.pin   || '').trim();
    if (!email || !pin) return respond({ success: false, error: 'Missing credentials' });
    const sheet = getSheet('Hoja 1');
    const data  = sheet.getDataRange().getValues();
    const col   = getHeaders(sheet);
    for (let i = 1; i < data.length; i++) {
      const row      = data[i];
      const rowEmail = String(row[col.email]  || '').toLowerCase().trim();
      const rowPin   = String(row[col.pin]    || '').trim();
      const rowActivo= String(row[col.activo] || '').toLowerCase().trim();
      if (rowEmail === email && rowPin === pin && rowActivo === 'si') {
        return respond({ success: true, nombre: row[col.nombre], email: row[col.email], rol: row[col.rol], propiedad: row[col.propiedad], area: row[col.area] });
      }
    }
    return respond({ success: false, error: 'Invalid credentials' });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleGetUsers(e) {
  try {
    if ((e.parameter.rol || '').toLowerCase() !== 'admin') return respond({ success: false, error: 'Unauthorized' });
    const sheet = getSheet('Hoja 1');
    const data  = sheet.getDataRange().getValues();
    const col   = getHeaders(sheet);
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[col.email]) continue;
      users.push({ id: i, nombre: row[col.nombre], email: row[col.email], rol: row[col.rol], propiedad: row[col.propiedad], activo: String(row[col.activo]).toLowerCase(), area: row[col.area] });
    }
    return respond({ success: true, users });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleCreateUser(e) {
  try {
    if ((e.parameter.reqRol || '').toLowerCase() !== 'admin') return respond({ success: false, error: 'Unauthorized' });
    const nombre = e.parameter.nombre || '', email = (e.parameter.email || '').toLowerCase().trim();
    const rol = e.parameter.rol || 'op', propiedad = e.parameter.propiedad || '';
    const pin = e.parameter.pin || '1234', area = e.parameter.area || 'todas';
    if (!nombre || !email) return respond({ success: false, error: 'nombre and email required' });
    const sheet = getSheet('Hoja 1'), data = sheet.getDataRange().getValues(), col = getHeaders(sheet);
    for (let i = 1; i < data.length; i++) { if (String(data[i][col.email]).toLowerCase().trim() === email) return respond({ success: false, error: 'Email already exists' }); }
    const newRow = []; newRow[col.nombre]=nombre; newRow[col.email]=email; newRow[col.rol]=rol; newRow[col.propiedad]=propiedad; newRow[col.pin]=pin; newRow[col.activo]='si'; newRow[col.area]=area;
    sheet.appendRow(newRow);
    return respond({ success: true, message: 'User created' });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleUpdateUser(e) {
  try {
    if ((e.parameter.reqRol || '').toLowerCase() !== 'admin') return respond({ success: false, error: 'Unauthorized' });
    const rowId = parseInt(e.parameter.rowId);
    if (!rowId) return respond({ success: false, error: 'rowId required' });
    const sheet = getSheet('Hoja 1'), col = getHeaders(sheet);
    ['nombre','email','rol','propiedad','pin','activo','area'].forEach(f => { if (e.parameter[f] !== undefined) sheet.getRange(rowId+1, col[f]+1).setValue(e.parameter[f]); });
    return respond({ success: true, message: 'User updated' });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleDeleteUser(e) {
  try {
    if ((e.parameter.reqRol || '').toLowerCase() !== 'admin') return respond({ success: false, error: 'Unauthorized' });
    const rowId = parseInt(e.parameter.rowId);
    if (!rowId) return respond({ success: false, error: 'rowId required' });
    const sheet = getSheet('Hoja 1'), col = getHeaders(sheet);
    sheet.getRange(rowId+1, col.activo+1).setValue('no');
    return respond({ success: true, message: 'User deactivated' });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleSaveChecklist(e) {
  try {
    const propiedad=e.parameter.propiedad||'', tab=e.parameter.tab||'';
    const grupo=e.parameter.grupo||'', item=e.parameter.item||'';
    const completado=e.parameter.completado||'false', usuario=e.parameter.usuario||'';
    const foto=e.parameter.foto||'';
    if (!propiedad||!tab||!item) return respond({ success: false, error: 'Missing required fields' });
    const sheet=getSheet('Checklists'), col=getHeaders(sheet), data=sheet.getDataRange().getValues();
    const today=new Date().toISOString().slice(0,10);
    const hora=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    for (let i=1; i<data.length; i++) {
      const row=data[i];
      if (String(row[col.fecha])===today && String(row[col.propiedad])===propiedad && String(row[col.tab])===tab && String(row[col.item])===item) {
        sheet.getRange(i+1,col.completado+1).setValue(completado);
        sheet.getRange(i+1,col.usuario+1).setValue(usuario);
        sheet.getRange(i+1,col.hora+1).setValue(hora);
        if (foto) sheet.getRange(i+1,col.foto+1).setValue(foto);
        return respond({ success: true, action: 'updated' });
      }
    }
    const newRow=[];
    newRow[col.fecha]=today; newRow[col.propiedad]=propiedad; newRow[col.tab]=tab;
    newRow[col.grupo]=grupo; newRow[col.item]=item; newRow[col.completado]=completado;
    newRow[col.usuario]=usuario; newRow[col.hora]=hora; newRow[col.foto]=foto||'';
    sheet.appendRow(newRow);
    return respond({ success: true, action: 'created' });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleGetChecklist(e) {
  try {
    const propiedad=e.parameter.propiedad||'';
    const fecha=e.parameter.fecha||new Date().toISOString().slice(0,10);
    if (!propiedad) return respond({ success: false, error: 'propiedad required' });
    const sheet=getSheet('Checklists'), data=sheet.getDataRange().getValues(), col=getHeaders(sheet);
    const items=[];
    for (let i=1; i<data.length; i++) {
      const row=data[i];
      if (String(row[col.fecha])===fecha && String(row[col.propiedad])===propiedad) {
        items.push({ tab:String(row[col.tab]||''), grupo:String(row[col.grupo]||''), item:String(row[col.item]||''), completado:String(row[col.completado]||'false'), usuario:String(row[col.usuario]||''), hora:String(row[col.hora]||''), foto:String(row[col.foto]||'') });
      }
    }
    return respond({ success: true, items, fecha });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ── ALERTS ────────────────────────────────────────────
// Add these to doGet:
// if (action === 'saveAlert')    return handleSaveAlert(e);
// if (action === 'getAlerts')    return handleGetAlerts(e);
// if (action === 'resolveAlert') return handleResolveAlert(e);

function handleSaveAlert(e) {
  try {
    const propiedad  = e.parameter.propiedad  || '';
    const titulo     = e.parameter.titulo     || '';
    const descripcion= e.parameter.descripcion|| '';
    const area       = e.parameter.area       || '';
    const criticidad = e.parameter.criticidad || 'media';
    const usuario    = e.parameter.usuario    || '';
    const estado     = e.parameter.estado     || 'activa';
    if (!titulo) return respond({ success: false, error: 'titulo required' });
    const sheet = getSheet('Alertas');
    const col   = getHeaders(sheet);
    const now   = new Date();
    const fecha = now.toISOString().slice(0,10);
    const hora  = now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    const id    = 'a' + now.getTime();
    const newRow = [];
    newRow[col.id]          = id;
    newRow[col.fecha]       = fecha;
    newRow[col.propiedad]   = propiedad;
    newRow[col.titulo]      = titulo;
    newRow[col.descripcion] = descripcion;
    newRow[col.area]        = area;
    newRow[col.criticidad]  = criticidad;
    newRow[col.usuario]     = usuario;
    newRow[col.hora]        = hora;
    newRow[col.estado]      = estado;
    sheet.appendRow(newRow);
    return respond({ success: true, id });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleGetAlerts(e) {
  try {
    const propiedad = e.parameter.propiedad || '';
    const sheet = getSheet('Alertas');
    const data  = sheet.getDataRange().getValues();
    const col   = getHeaders(sheet);
    const alerts = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[col.titulo]) continue;
      if (propiedad && String(row[col.propiedad]) !== propiedad) continue;
      alerts.push({
        id:          String(row[col.id]          || ''),
        fecha:       String(row[col.fecha]        || ''),
        propiedad:   String(row[col.propiedad]    || ''),
        titulo:      String(row[col.titulo]       || ''),
        descripcion: String(row[col.descripcion]  || ''),
        area:        String(row[col.area]         || ''),
        criticidad:  String(row[col.criticidad]   || ''),
        usuario:     String(row[col.usuario]      || ''),
        hora:        String(row[col.hora]         || ''),
        estado:      String(row[col.estado]       || 'activa'),
      });
    }
    return respond({ success: true, alerts });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}

function handleResolveAlert(e) {
  try {
    const id    = e.parameter.id || '';
    if (!id) return respond({ success: false, error: 'id required' });
    const sheet = getSheet('Alertas');
    const data  = sheet.getDataRange().getValues();
    const col   = getHeaders(sheet);
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][col.id]) === id) {
        sheet.getRange(i+1, col.estado+1).setValue('resuelta');
        return respond({ success: true });
      }
    }
    return respond({ success: false, error: 'Alert not found' });
  } catch(err) { return respond({ success: false, error: err.toString() }); }
}
