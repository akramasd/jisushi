/**
 * PREPNEST — ordre-backup og nødsystem
 * ====================================
 *
 * Dette script gør ét regneark til tre ting:
 *
 *   1. En LØBENDE KOPI af hver eneste ordre, skrevet i samme sekund som den
 *      oprettes. Regnearket er derfor aldrig koldt, når I får brug for det.
 *   2. En BACKUP. Supabase' gratis-plan tager ingen backup. Det her gør.
 *   3. Et NØDSYSTEM. Går hjemmesiden ned, tager I imod via Google Form —
 *      ordrerne lander i det samme ark, og køkkenet arbejder videre.
 *
 * Fanerne:
 *   "Alle ordrer"  — rådata, alt. Rør den ikke i hånden.
 *   "I dag"        — kun dagens, sorteret. Den køkkenet kigger på.
 *   "Køkken"       — stort format til skærm/print, med farver efter status.
 *
 * Opsætning står i OPSÆTNING.md.
 */

const SHEET_ALL = 'Alle ordrer'
const SHEET_TODAY = 'I dag'
const SHEET_KITCHEN = 'Køkken'
const TZ = 'Europe/Copenhagen'

/** Skal matche PREPNEST_SHEET_SECRET i Vercel. Sæt den under Projektindstillinger. */
function sharedSecret() {
  return PropertiesService.getScriptProperties().getProperty('PREPNEST_SECRET') || ''
}

const HEADERS = [
  'Tidspunkt', 'Ordre nr.', 'Navn', 'Telefon', 'Retter',
  'I alt (kr)', 'Afhentning', 'Status', 'Kilde', 'Ordre-ID',
]

// ────────────────────────────────────────────────────────── indgang

/**
 * Modtager ordrer fra hjemmesiden.
 *
 * Svarer altid 200 med JSON. Et fejlsvar her må aldrig få hjemmesidens
 * checkout til at fejle — backuppen er en sikkerhedsline, ikke en afhængighed.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)

    const secret = sharedSecret()
    if (secret && body.secret !== secret) {
      return json({ ok: false, error: 'unauthorized' })
    }

    const order = body.order || body
    appendOrder({
      at: order.createdAt || new Date().toISOString(),
      orderNo: order.orderNo || '',
      name: order.customerName || '',
      phone: order.customerPhone || '',
      items: formatItems(order.items),
      total: order.total || 0,
      pickup: order.pickupMinutes ? order.pickupMinutes + ' min' : '',
      status: order.status || 'Ny',
      source: order.source || 'Hjemmeside',
      id: order.id || '',
    })

    return json({ ok: true })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
}

/** Google Form-indsendelser (nødsystemet) lander her. */
function onFormSubmit(e) {
  const v = e.namedValues || {}
  const get = (k) => (v[k] && v[k][0]) || ''

  appendOrder({
    at: new Date().toISOString(),
    orderNo: 'F' + Utilities.formatDate(new Date(), TZ, 'HHmm'),
    name: get('Navn'),
    phone: get('Telefon'),
    items: get('Bestilling'),
    total: get('Cirka pris') || '',
    pickup: get('Afhentning'),
    status: 'Ny',
    source: 'NØDFORMULAR',
    id: '',
  })
}

// ────────────────────────────────────────────────────────── skrivning

function appendOrder(o) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const all = ensureSheet(ss, SHEET_ALL)

  // Samme ordre må ikke lande to gange, hvis hjemmesiden prøver igen.
  if (o.id) {
    const ids = all.getRange(2, 10, Math.max(all.getLastRow() - 1, 1), 1).getValues()
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === o.id) {
        all.getRange(i + 2, 8).setValue(o.status) // opdater kun status
        rebuildViews()
        return
      }
    }
  }

  const local = Utilities.formatDate(new Date(o.at), TZ, 'dd/MM/yyyy HH:mm')
  all.appendRow([local, o.orderNo, o.name, o.phone, o.items, o.total, o.pickup, o.status, o.source, o.id])

  rebuildViews()
  if (o.source === 'NØDFORMULAR') notifyKitchen(o)
}

function formatItems(items) {
  if (!items) return ''
  if (typeof items === 'string') return items
  return items.map((i) => (i.qty || 1) + '× ' + (i.name || '')).join('\n')
}

// ────────────────────────────────────────────────────────── visninger

/** Bygger "I dag" og "Køkken" på ny ud fra rådata. */
function rebuildViews() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const all = ensureSheet(ss, SHEET_ALL)
  const rows = all.getLastRow() > 1
    ? all.getRange(2, 1, all.getLastRow() - 1, HEADERS.length).getValues()
    : []

  const today = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy')
  const mine = rows.filter((r) => String(r[0]).indexOf(today) === 0)

  writeToday(ss, mine, today)
  writeKitchen(ss, mine, today)
}

function writeToday(ss, rows, today) {
  const sh = ensureSheet(ss, SHEET_TODAY)
  sh.clear()

  sh.getRange(1, 1).setValue('ORDRER I DAG · ' + today)
    .setFontSize(16).setFontWeight('bold')
  sh.getRange(2, 1).setValue(
    rows.length + ' ordrer · ' +
    rows.filter((r) => r[7] === 'Ny' || r[7] === 'pending').length + ' venter',
  ).setFontColor('#666')

  sh.getRange(4, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#0E0F11').setFontColor('#C1AB7F')

  if (rows.length) {
    sh.getRange(5, 1, rows.length, HEADERS.length).setValues(rows)
  }
  sh.setColumnWidth(5, 260)
  sh.getRange(5, 5, Math.max(rows.length, 1), 1).setWrap(true)
  applyStatusColours(sh, 5, rows.length)
  sh.setFrozenRows(4)
}

/**
 * Køkkenvisningen. Stor skrift, få kolonner, farve efter status — beregnet til
 * at blive læst på afstand eller printet, ikke til at blive redigeret.
 */
function writeKitchen(ss, rows, today) {
  const sh = ensureSheet(ss, SHEET_KITCHEN)
  sh.clear()

  const waiting = rows.filter((r) => r[7] === 'Ny' || r[7] === 'pending')

  sh.getRange(1, 1).setValue('KØKKEN · ' + today)
    .setFontSize(22).setFontWeight('bold')
  sh.getRange(2, 1).setValue(
    waiting.length
      ? waiting.length + ' ORDRER VENTER'
      : 'Ingen ordrer venter',
  ).setFontSize(14).setFontWeight('bold')
    .setFontColor(waiting.length ? '#B00020' : '#0A7B34')

  const head = ['Nr.', 'Navn', 'Telefon', 'Retter', 'Afhent', 'Status']
  sh.getRange(4, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setFontSize(12)
    .setBackground('#0E0F11').setFontColor('#C1AB7F')

  // Ventende først — det er dem, nogen står og venter på.
  const ordered = waiting.concat(rows.filter((r) => waiting.indexOf(r) === -1))
  const view = ordered.map((r) => [r[1], r[2], r[3], r[4], r[6], r[7]])

  if (view.length) {
    sh.getRange(5, 1, view.length, head.length).setValues(view)
    sh.getRange(5, 1, view.length, head.length).setFontSize(12)
  }

  sh.setColumnWidth(1, 70)
  sh.setColumnWidth(2, 160)
  sh.setColumnWidth(3, 120)
  sh.setColumnWidth(4, 360)
  sh.getRange(5, 4, Math.max(view.length, 1), 1).setWrap(true)
  applyStatusColours(sh, 5, view.length, 6)
  sh.setFrozenRows(4)
}

/** Ny = rød, i gang = gul, klar = grøn, afhentet = grå. */
function applyStatusColours(sh, startRow, count, statusCol) {
  if (!count) return
  const col = statusCol || 8
  const values = sh.getRange(startRow, col, count, 1).getValues()

  for (let i = 0; i < count; i++) {
    const s = String(values[i][0]).toLowerCase()
    let bg = null
    if (s === 'ny' || s === 'pending') bg = '#FFE0E0'
    else if (s === 'accepted' || s === 'i gang') bg = '#FFF4CC'
    else if (s === 'ready' || s === 'klar') bg = '#DFF5E1'
    else if (s === 'completed' || s === 'afhentet') bg = '#EFEFEF'
    else if (s === 'cancelled' || s === 'annulleret') bg = '#E8E8E8'
    if (bg) sh.getRange(startRow + i, 1, 1, sh.getLastColumn()).setBackground(bg)
  }
}

// ────────────────────────────────────────────────────────── hjælpere

function ensureSheet(ss, name) {
  let sh = ss.getSheetByName(name)
  if (!sh) {
    sh = ss.insertSheet(name)
    if (name === SHEET_ALL) {
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
        .setFontWeight('bold').setBackground('#0E0F11').setFontColor('#C1AB7F')
      sh.setFrozenRows(1)
    }
  }
  return sh
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

/** Sender en mail, når en nødordre kommer ind — ingen skærm at kigge på. */
function notifyKitchen(o) {
  const to = PropertiesService.getScriptProperties().getProperty('KITCHEN_EMAIL')
  if (!to) return
  MailApp.sendEmail({
    to: to,
    subject: 'NØDORDRE ' + o.orderNo + ' — ' + o.name,
    body:
      'Der er kommet en ordre via nødformularen.\n\n' +
      'Navn: ' + o.name + '\nTelefon: ' + o.phone + '\n\n' +
      o.items + '\n\nAfhentning: ' + o.pickup + '\n\n' +
      'Åbn regnearket, fanen "Køkken".',
  })
}

/**
 * Sender statusændringer fra regnearket tilbage til hjemmesiden.
 *
 * Retter køkkenet en status i arket — typisk i nødspor, hvor skærmen ikke
 * virker — skal kunden også kunne se det. Uden det her er arket en blindgyde:
 * data kan komme ind, men aldrig ud igen.
 *
 * Kør automatisk hvert minut via en tidsudløser (se OPSAETNING.md).
 */
function pushStatusChanges() {
  const url = PropertiesService.getScriptProperties().getProperty('PREPNEST_SYNC_URL')
  const secret = sharedSecret()
  if (!url) return

  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const all = ensureSheet(ss, SHEET_ALL)
  if (all.getLastRow() < 2) return

  const rows = all.getRange(2, 1, all.getLastRow() - 1, HEADERS.length).getValues()

  // Kolonne 11 husker, hvad vi sidst har sendt. Kun ændringer ryger afsted,
  // så et minutkald ikke sender 400 uændrede rækker hver gang.
  const lastSent = all.getRange(2, 11, rows.length, 1).getValues()
  const updates = []

  for (let i = 0; i < rows.length; i++) {
    const orderNo = rows[i][1]
    const status = String(rows[i][7] || '').trim()
    if (!orderNo || !status) continue
    if (String(lastSent[i][0] || '') === status) continue
    updates.push({ row: i + 2, orderNo: orderNo, status: status })
  }

  if (!updates.length) return

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({ secret: secret, updates: updates }),
    })
    if (res.getResponseCode() === 200) {
      for (let j = 0; j < updates.length; j++) {
        all.getRange(updates[j].row, 11).setValue(updates[j].status)
      }
    }
  } catch (err) {
    // Stille. Næste kørsel prøver igen — og rækkerne er stadig markeret usendte.
  }
}

/** Kør én gang i hånden for at oprette fanerne. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  ensureSheet(ss, SHEET_ALL)
  rebuildViews()
  SpreadsheetApp.getUi().alert('Klar. Faner oprettet.')
}
