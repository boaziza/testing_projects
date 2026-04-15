import urllib.request, json, time, urllib.error

PROJECT  = '69de2ba3003855a6c17c'
KEY      = 'standard_9ec653293db60a3fdbe66a9a9c7fe70a20d876861fda9fd35a6304789f1f6cdd846d7946394afcde224710f769ca4573c15f446177622c2b022bc2d91d9ec2acdc8bf0475012a5525cfa9c51e065b3312a357f93300a87d8dd38403c460149cf8b9f60383a32a641f10bb445c86b50a3975400e8fc2330026db3c9b7f99b8691'
BASE     = 'https://cloud.appwrite.io/v1'
HEADERS  = {
    'X-Appwrite-Project': PROJECT,
    'X-Appwrite-Key': KEY,
    'Content-Type': 'application/json',
    'User-Agent': 'AppwriteSDK/node-appwrite/12.0.0',
}

def api(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(BASE + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f'    ERROR {e.code}: {msg[:200]}')
        return None

def w(ms=350): time.sleep(ms/1000)

def make_col(db, name):
    r = api('POST', f'/databases/{db}/collections', {'collectionId':'unique()','name':name,'permissions':[]})
    if r:
        print(f'  + {name} -> {r["$id"]}')
        return r['$id']
    return None

def s(db,c,k,sz,req,dflt=None):
    b={'key':k,'size':sz,'required':req,'array':False}
    if dflt is not None: b['default']=dflt
    api('POST',f'/databases/{db}/collections/{c}/attributes/string',b); w()

def ii(db,c,k,req,dflt=None):
    b={'key':k,'required':req,'array':False}
    if dflt is not None: b['default']=dflt
    api('POST',f'/databases/{db}/collections/{c}/attributes/integer',b); w()

def fl(db,c,k,req):
    api('POST',f'/databases/{db}/collections/{c}/attributes/float',{'key':k,'required':req,'array':False}); w()

def bl(db,c,k,req,dflt=None):
    b={'key':k,'required':req,'array':False}
    if dflt is not None: b['default']=dflt
    api('POST',f'/databases/{db}/collections/{c}/attributes/boolean',b); w()

def dt(db,c,k,req):
    api('POST',f'/databases/{db}/collections/{c}/attributes/datetime',{'key':k,'required':req,'array':False}); w()

def en(db,c,k,els,req):
    api('POST',f'/databases/{db}/collections/{c}/attributes/enum',{'key':k,'elements':els,'required':req,'array':False}); w()

def idx(db,c,k,t,attrs):
    api('POST',f'/databases/{db}/collections/{c}/indexes',{'key':k,'type':t,'attributes':attrs,'orders':['ASC']*len(attrs)}); w(500)

def wait_attrs(secs, label):
    print(f'  waiting {secs}s for {label} attributes to become available...')
    time.sleep(secs)

# ── Create database ────────────────────────────────────────────────────────────
print('Creating database rapport_v2...')
r = api('POST','/databases',{'databaseId':'unique()','name':'rapport_v2'})
DB = r['$id']
print(f'Database -> {DB}')

IDS = {'APPWRITE_DATABASE_ID': DB}

# ── settings ──────────────────────────────────────────────────────────────────
print('\nsettings...')
C = make_col(DB, 'settings')
ii(DB,C,'pmsPrice',    True)
ii(DB,C,'agoPrice',    True)
s (DB,C,'stationName', 200, False)
s (DB,C,'updatedBy',   200, False)
IDS['APPWRITE_SETTINGS_ID'] = C

# ── admin ─────────────────────────────────────────────────────────────────────
print('\nadmin...')
C = make_col(DB, 'admin')
s (DB,C,'email',   200, True)
s (DB,C,'name',    200, False)
en(DB,C,'role',    ['admin','manager'], True)
dt(DB,C,'addedAt', True)
s (DB,C,'addedBy', 200, False)
wait_attrs(8, 'admin')
idx(DB,C,'idx_email_unique','unique',['email'])
idx(DB,C,'idx_role',        'key',   ['role'])
IDS['APPWRITE_ADMIN_ID'] = C

# ── customers ─────────────────────────────────────────────────────────────────
print('\ncustomers...')
C = make_col(DB, 'customers')
s(DB,C,'plate',     50,  True)
s(DB,C,'company',   200, False)
s(DB,C,'driver',    200, False)
s(DB,C,'tinNumber',  20, False)
wait_attrs(6, 'customers')
idx(DB,C,'idx_plate_unique','unique',['plate'])
idx(DB,C,'idx_company',     'key',   ['company'])
IDS['APPWRITE_CUSTOMERS_ID'] = C

# ── dailyReports ──────────────────────────────────────────────────────────────
print('\ndailyReports...')
C = make_col(DB, 'dailyReports')
s (DB,C,'email',         200, True)
s (DB,C,'employee',      200, True)
en(DB,C,'shift',         ['AM','PM'], True)
dt(DB,C,'logDate',            True)
s (DB,C,'shiftKey',      200, True)
ii(DB,C,'pmsPrice',           True)
ii(DB,C,'agoPrice',           True)
ii(DB,C,'totalPms',           True)
ii(DB,C,'totalAgo',           True)
ii(DB,C,'totalVente',         True)
fl(DB,C,'venteLitresPms',     True)
fl(DB,C,'venteLitresAgo',     True)
fl(DB,C,'pms1',               True)
fl(DB,C,'pms2',               True)
fl(DB,C,'pms3',               True)
fl(DB,C,'pms4',               True)
fl(DB,C,'ago1',               True)
fl(DB,C,'ago2',               True)
fl(DB,C,'ago3',               True)
fl(DB,C,'ago4',               True)
wait_attrs(10, 'dailyReports')
idx(DB,C,'idx_shiftKey','unique',['shiftKey'])
idx(DB,C,'idx_email',   'key',   ['email'])
idx(DB,C,'idx_logDate', 'key',   ['logDate'])
idx(DB,C,'idx_shift',   'key',   ['shift'])
IDS['APPWRITE_DAILY_REPORTS_ID'] = C

# ── payments ──────────────────────────────────────────────────────────────────
print('\npayments...')
C = make_col(DB, 'payments')
s (DB,C,'email',       200, True)
s (DB,C,'employee',    200, True)
en(DB,C,'shift',       ['AM','PM'], True)
dt(DB,C,'logDate',          True)
s (DB,C,'shiftKey',    200, True)
ii(DB,C,'momo',             True,  0)
ii(DB,C,'momoLoss',         True,  0)
ii(DB,C,'bankCard',         True,  0)
ii(DB,C,'totalCash',        True,  0)
ii(DB,C,'cash5000',         False)
ii(DB,C,'cash2000',         False)
ii(DB,C,'cash1000',         False)
ii(DB,C,'cash500',          False)
ii(DB,C,'totalFiche',       True,  0)
ii(DB,C,'spFuelCard',       True,  0)
ii(DB,C,'totalPayments',    True,  0)
ii(DB,C,'gainPayments',     True,  0)
ii(DB,C,'totalLoans',       True,  0)
ii(DB,C,'bon',              False)
ii(DB,C,'totalVente',       True,  0)
wait_attrs(10, 'payments')
idx(DB,C,'idx_shiftKey','unique',['shiftKey'])
idx(DB,C,'idx_email',   'key',   ['email'])
idx(DB,C,'idx_logDate', 'key',   ['logDate'])
IDS['APPWRITE_PAYMENTS_ID'] = C

# ── loans ─────────────────────────────────────────────────────────────────────
print('\nloans...')
C = make_col(DB, 'loans')
s (DB,C,'plate',    50,  True)
s (DB,C,'company',  200, False)
s (DB,C,'email',    200, True)
s (DB,C,'employee', 200, True)
en(DB,C,'shift',    ['AM','PM'], True)
s (DB,C,'monthYear',  7, True)
dt(DB,C,'logDate',       True)
ii(DB,C,'amount',        True)
wait_attrs(6, 'loans')
idx(DB,C,'idx_email',     'key',['email'])
idx(DB,C,'idx_logDate',   'key',['logDate'])
idx(DB,C,'idx_monthYear', 'key',['monthYear'])
idx(DB,C,'idx_plate',     'key',['plate'])
IDS['APPWRITE_LOANS_ID'] = C

# ── fiche ─────────────────────────────────────────────────────────────────────
print('\nfiche...')
C = make_col(DB, 'fiche')
s (DB,C,'plate',    50,  True)
s (DB,C,'company',  200, False)
s (DB,C,'email',    200, True)
s (DB,C,'employee', 200, True)
en(DB,C,'shift',    ['AM','PM'], True)
dt(DB,C,'logDate',       True)
ii(DB,C,'amount',        True)
wait_attrs(6, 'fiche')
idx(DB,C,'idx_email',  'key',['email'])
idx(DB,C,'idx_logDate','key',['logDate'])
idx(DB,C,'idx_plate',  'key',['plate'])
IDS['APPWRITE_FICHE_ID'] = C

# ── stockDaily ────────────────────────────────────────────────────────────────
print('\nstockDaily...')
C = make_col(DB, 'stockDaily')
s (DB,C,'email',          200, True)
en(DB,C,'fuelType',       ['PMS','AGO'], True)
dt(DB,C,'logDate',             True)
s (DB,C,'stockKey',        50, True)
ii(DB,C,'initialStock',        True)
ii(DB,C,'venteLitres',         True)
ii(DB,C,'receivedLitres',      False)
ii(DB,C,'physicalStock',       True)
ii(DB,C,'theoryStock',         True)
ii(DB,C,'gainFuel',            True)
wait_attrs(8, 'stockDaily')
idx(DB,C,'idx_stockKey', 'unique',['stockKey'])
idx(DB,C,'idx_logDate',  'key',   ['logDate'])
idx(DB,C,'idx_fuelType', 'key',   ['fuelType'])
idx(DB,C,'idx_email',    'key',   ['email'])
IDS['APPWRITE_STOCK_DAILY_ID'] = C

# ── stock ─────────────────────────────────────────────────────────────────────
print('\nstock...')
C = make_col(DB, 'stock')
s (DB,C,'monthYear',          7, True)
ii(DB,C,'totalGainFuelPms',      True)
ii(DB,C,'totalGainFuelAgo',      True)
ii(DB,C,'totalVenteLitresPms',   True)
ii(DB,C,'totalVenteLitresAgo',   True)
ii(DB,C,'totalReceivedPms',      False)
ii(DB,C,'totalReceivedAgo',      False)
wait_attrs(6, 'stock')
idx(DB,C,'idx_monthYear','unique',['monthYear'])
IDS['APPWRITE_STOCK_ID'] = C

# ── situation ─────────────────────────────────────────────────────────────────
print('\nsituation...')
C = make_col(DB, 'situation')
s (DB,C,'email',         200, True)
s (DB,C,'employee',      200, True)
dt(DB,C,'logDate',            True)
s (DB,C,'situationKey',  200, True)
bl(DB,C,'done',               False, False)
ii(DB,C,'pmsPrice',           True)
ii(DB,C,'agoPrice',           True)
ii(DB,C,'totalPms',           True)
ii(DB,C,'totalAgo',           True)
ii(DB,C,'totalVente',         True)
fl(DB,C,'venteLitresPms',     False)
fl(DB,C,'venteLitresAgo',     False)
ii(DB,C,'receivedPms',        False)
ii(DB,C,'receivedAgo',        False)
ii(DB,C,'initialPms',         False)
ii(DB,C,'initialAgo',         False)
ii(DB,C,'physicalStockPms',   False)
ii(DB,C,'physicalStockAgo',   False)
ii(DB,C,'theoryStockPms',     False)
ii(DB,C,'theoryStockAgo',     False)
ii(DB,C,'gainFuelPms',        False)
ii(DB,C,'gainFuelAgo',        False)
ii(DB,C,'momo',               True,  0)
ii(DB,C,'momoLoss',           True,  0)
ii(DB,C,'totalFiche',         True,  0)
ii(DB,C,'bankCard',           True,  0)
ii(DB,C,'totalCash',          True,  0)
ii(DB,C,'totalPayments',      True,  0)
ii(DB,C,'gainPayments',       True,  0)
ii(DB,C,'spFuelCard',         True,  0)
ii(DB,C,'totalLoans',         False)
ii(DB,C,'bon',                False)
wait_attrs(12, 'situation')
idx(DB,C,'idx_situationKey','unique',['situationKey'])
idx(DB,C,'idx_logDate',     'key',   ['logDate'])
idx(DB,C,'idx_email',       'key',   ['email'])
IDS['APPWRITE_SITUATION_ID'] = C

# ── gainPompiste ──────────────────────────────────────────────────────────────
print('\ngainPompiste...')
C = make_col(DB, 'gainPompiste')
s (DB,C,'email',      200, True)
s (DB,C,'employee',   200, True)
s (DB,C,'monthYear',    7, True)
dt(DB,C,'logDate',         True)
s (DB,C,'gainKey',     200, True)
ii(DB,C,'gainPayments',    True)
wait_attrs(6, 'gainPompiste')
idx(DB,C,'idx_gainKey',   'unique',['gainKey'])
idx(DB,C,'idx_email',     'key',   ['email'])
idx(DB,C,'idx_monthYear', 'key',   ['monthYear'])
IDS['APPWRITE_GAIN_ID'] = C

# ── employeeLogs ──────────────────────────────────────────────────────────────
print('\nemployeeLogs...')
C = make_col(DB, 'employeeLogs')
s (DB,C,'email',      200, True)
s (DB,C,'employeeId',  50, True)
dt(DB,C,'logDate',         True)
wait_attrs(5, 'employeeLogs')
idx(DB,C,'idx_email',  'key',['email'])
idx(DB,C,'idx_logDate','key',['logDate'])
IDS['APPWRITE_EMPLOYEE_LOGS_ID'] = C

# ── Print .env block ──────────────────────────────────────────────────────────
print('\n\n===== Copy into .env =====')
for k,v in IDS.items():
    print(f'{k}={v}')
print('==========================')
